package com.jachwisunbae.property.service;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.entity.UserChecklist;
import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.repository.SystemCheckItemRepository;
import com.jachwisunbae.checklist.repository.UserChecklistRepository;
import com.jachwisunbae.checklist.service.MemberChecklistPreferenceService;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.common.exception.client.BusinessRuleViolationException;
import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.property.repository.PropertyChecklistRepository;
import com.jachwisunbae.property.repository.PropertyChecklistItemRepository;
import com.jachwisunbae.property.repository.PropertyProgressRepository;
import com.jachwisunbae.property.repository.PropertyRepository;
import com.jachwisunbae.property.repository.query.PropertyChecklistApplicationQuery;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemStateQuery;
import com.jachwisunbae.property.repository.query.PropertyChecklistProgressQuery;
import com.jachwisunbae.property.type.PropertyChecklistSourceType;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@Transactional(readOnly = true)
public class PropertyChecklistService {

    private final PropertyRepository propertyRepository;
    private final UserChecklistRepository userChecklistRepository;
    private final PropertyChecklistRepository propertyChecklistRepository;
    private final PropertyChecklistItemRepository propertyChecklistItemRepository;
    private final PropertyProgressRepository propertyProgressRepository;
    private final SystemCheckItemRepository systemCheckItemRepository;
    private final MemberChecklistPreferenceService preferenceService;

    public PropertyChecklistService(final PropertyRepository propertyRepository,
                                    final UserChecklistRepository userChecklistRepository,
                                    final PropertyChecklistRepository propertyChecklistRepository,
                                    final PropertyChecklistItemRepository propertyChecklistItemRepository,
                                    final PropertyProgressRepository propertyProgressRepository,
                                    final SystemCheckItemRepository systemCheckItemRepository,
                                    final MemberChecklistPreferenceService preferenceService) {
        this.propertyRepository = propertyRepository;
        this.userChecklistRepository = userChecklistRepository;
        this.propertyChecklistRepository = propertyChecklistRepository;
        this.propertyChecklistItemRepository = propertyChecklistItemRepository;
        this.propertyProgressRepository = propertyProgressRepository;
        this.systemCheckItemRepository = systemCheckItemRepository;
        this.preferenceService = preferenceService;
    }

    @Transactional
    public void applyInitialChecklists(final Long memberId, final Long propertyId) {
        for (CheckStage stage : CheckStage.values()) {
            applyInitialChecklist(memberId, propertyId, stage);
        }
    }

    private void applyInitialChecklist(final Long memberId, final Long propertyId, final CheckStage stage) {
        List<SystemCheckItem> coreItems = systemCheckItemRepository.findActiveCoreByStage(stage);
        if (coreItems.isEmpty()) {
            return;
        }
        Optional<UserChecklist> preferredChecklist = findPreferredChecklist(memberId, stage);
        if (preferredChecklist.isPresent()) {
            applyUserChecklist(propertyId, stage, preferredChecklist.get(), List.of());
            return;
        }
        saveSystemChecklist(propertyId, stage, coreItems, List.of());
    }

    private Optional<UserChecklist> findPreferredChecklist(final Long memberId, final CheckStage stage) {
        Long preferredChecklistId = preferenceService.findPreferredChecklistId(memberId, stage);
        if (preferredChecklistId == null) {
            return Optional.empty();
        }
        return userChecklistRepository.findByIdAndMemberId(preferredChecklistId, memberId)
            .filter(checklist -> checklist.getStage() == stage);
    }

    @Transactional
    public PropertyChecklistApplicationQuery apply(final Long memberId, final Long propertyId,
                                                   final CheckStage stage,
                                                   final PropertyChecklistSourceType sourceType,
                                                   final Long checklistId) {
        validateOwnedPropertyForUpdate(memberId, propertyId);
        List<SystemCheckItem> coreItems = sourceType == PropertyChecklistSourceType.SYSTEM_DEFAULT
                ? systemCheckItemRepository.findActiveCoreByStage(stage) : List.of();
        if (sourceType == PropertyChecklistSourceType.SYSTEM_DEFAULT && coreItems.isEmpty()) {
            throw new BusinessRuleViolationException(ErrorCode.CHECKLIST_INACTIVE_ITEM_NOT_ALLOWED,
                "현재 제공하지 않는 단계의 기본 체크리스트는 적용할 수 없습니다.");
        }

        List<PropertyChecklistItemStateQuery> previous = propertyChecklistItemRepository.findCurrentStates(propertyId, stage);
        propertyChecklistItemRepository.deleteByPropertyAndStage(propertyId, stage);
        propertyChecklistRepository.deleteByPropertyAndStage(propertyId, stage);

        if (sourceType == PropertyChecklistSourceType.SYSTEM_DEFAULT) {
            long propertyChecklistId = saveSystemChecklist(propertyId, stage, coreItems, previous);
            return completeApplication(memberId, propertyId, stage, propertyChecklistId, null);
        }

        UserChecklist checklist = findApplicableUserChecklist(memberId, stage, checklistId);
        long propertyChecklistId = applyUserChecklist(propertyId, stage, checklist, previous);
        return completeApplication(memberId, propertyId, stage, propertyChecklistId, checklist.getId());
    }

    private PropertyChecklistApplicationQuery completeApplication(
        final Long memberId,
        final Long propertyId,
        final CheckStage stage,
        final long propertyChecklistId,
        final Long preferredChecklistId
    ) {
        preferenceService.save(memberId, stage, preferredChecklistId);
        return findApplication(memberId, propertyId, propertyChecklistId);
    }

    private void validateOwnedPropertyForUpdate(final Long memberId, final Long propertyId) {
        propertyRepository.findByIdAndMemberIdForUpdate(propertyId, memberId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PROPERTY_NOT_FOUND,
                "매물을 찾을 수 없습니다."));
    }

    private long saveSystemChecklist(final Long propertyId, final CheckStage stage,
                                     final List<SystemCheckItem> coreItems,
                                     final List<PropertyChecklistItemStateQuery> previousItems) {
        long propertyChecklistId = propertyChecklistRepository.save(
            propertyId, null, "시스템 기본 체크리스트", stage);
        propertyChecklistItemRepository.saveAll(propertyChecklistId,
            createDefaultSnapshotItems(coreItems, previousItems));
        return propertyChecklistId;
    }

    private UserChecklist findApplicableUserChecklist(final Long memberId, final CheckStage stage,
                                                      final Long checklistId) {
        if (checklistId == null) {
            throw new ResourceNotFoundException(ErrorCode.CHECKLIST_NOT_FOUND,
                "적용할 체크리스트 ID가 필요합니다.");
        }
        UserChecklist checklist = userChecklistRepository.findByIdAndMemberIdForUpdate(checklistId, memberId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CHECKLIST_NOT_FOUND,
                "체크리스트를 찾을 수 없습니다."));

        if (checklist.getStage() != stage) {
            throw new BusinessRuleViolationException(ErrorCode.PROPERTY_CHECKLIST_STAGE_MISMATCH,
                "매물 적용 단계와 체크리스트 단계가 다릅니다.");
        }
        return checklist;
    }

    private long applyUserChecklist(final Long propertyId, final CheckStage stage,
                                    final UserChecklist checklist,
                                    final List<PropertyChecklistItemStateQuery> previousItems) {

        long propertyChecklistId = propertyChecklistRepository.save(propertyId, checklist.getId(), checklist.getName(), stage);
        List<UserChecklistItem> sourceItems = userChecklistRepository.findItems(checklist.getId());

        propertyChecklistItemRepository.saveAll(propertyChecklistId,
            createSnapshotItems(sourceItems, previousItems));
        return propertyChecklistId;
    }

    private List<PropertyChecklistItemStateQuery> createDefaultSnapshotItems(
        final List<SystemCheckItem> sourceItems,
        final List<PropertyChecklistItemStateQuery> previousItems) {
        Map<Long, PropertyChecklistItemStateQuery> previousBySystemId = previousItems.stream()
            .filter(item -> item.systemCheckItemId() != null)
            .collect(Collectors.toMap(PropertyChecklistItemStateQuery::systemCheckItemId, Function.identity(), (first, ignored) -> first));

        return IntStream.range(0, sourceItems.size())
            .mapToObj(index -> {
                SystemCheckItem item = sourceItems.get(index);
                PropertyChecklistItemStateQuery previous = previousBySystemId.get(item.getId());
                return createDefaultSnapshotItem(item, index + 1, previous);
            }).toList();
    }

    private PropertyChecklistItemStateQuery createDefaultSnapshotItem(
        final SystemCheckItem item,
        final int displayOrder,
        final PropertyChecklistItemStateQuery previous
    ) {
        if (previous == null) {
            return new PropertyChecklistItemStateQuery(
                item.getId(), item.getQuestion(), displayOrder, CheckStatus.UNCONFIRMED, "");
        }
        return new PropertyChecklistItemStateQuery(
            item.getId(), item.getQuestion(), displayOrder, previous.status(), previous.memo());
    }

    private List<PropertyChecklistItemStateQuery> createSnapshotItems(
        final List<UserChecklistItem> sourceItems,
        final List<PropertyChecklistItemStateQuery> previousItems) {

        Map<Long, PropertyChecklistItemStateQuery> previousBySystemId = previousItems.stream()
            .filter(item -> item.systemCheckItemId() != null)
            .collect(Collectors.toMap(PropertyChecklistItemStateQuery::systemCheckItemId, Function.identity(), (first, ignored) -> first));

        return sourceItems.stream()
            .map(item -> inheritState(item, previousBySystemId.get(item.getSystemCheckItemId())))
            .toList();
    }

    private PropertyChecklistItemStateQuery inheritState(final UserChecklistItem item,
                                                         final PropertyChecklistItemStateQuery previous) {
        if (previous == null) {
            return new PropertyChecklistItemStateQuery(
                item.getSystemCheckItemId(),
                item.getQuestion(),
                item.getDisplayOrder(),
                CheckStatus.UNCONFIRMED,
                ""
            );
        }
        return new PropertyChecklistItemStateQuery(
            item.getSystemCheckItemId(),
            item.getQuestion(),
            item.getDisplayOrder(),
            previous.status(),
            previous.memo()
        );
    }

    public List<PropertyChecklistProgressQuery> findOverview(final Long memberId, final Long propertyId) {
        if (!propertyRepository.existsByIdAndMemberId(propertyId, memberId)) {
            throw new ResourceNotFoundException(ErrorCode.PROPERTY_NOT_FOUND, "매물을 찾을 수 없습니다.");
        }
        return propertyProgressRepository.findByPropertyIdAndStage(propertyId);
    }

    public PropertyChecklistApplicationQuery findApplication(final Long memberId, final Long propertyId,
                                                             final Long propertyChecklistId) {
        return propertyChecklistRepository.findApplication(memberId, propertyId, propertyChecklistId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PROPERTY_CHECKLIST_NOT_FOUND,
                "매물 적용 체크리스트를 찾을 수 없습니다."));
    }

}
