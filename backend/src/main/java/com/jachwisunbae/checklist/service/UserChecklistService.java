package com.jachwisunbae.checklist.service;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.entity.UserChecklist;
import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.repository.SystemCheckItemRepository;
import com.jachwisunbae.checklist.repository.UserChecklistRepository;
import com.jachwisunbae.checklist.repository.query.UserChecklistItemDetail;
import com.jachwisunbae.checklist.repository.query.UserChecklistSummaryQuery;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.common.exception.client.BusinessRuleViolationException;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@Transactional(readOnly = true)
public class UserChecklistService {

    private final SystemCheckItemRepository systemCheckItemRepository;
    private final UserChecklistRepository userChecklistRepository;
    private final MemberRepository memberRepository;

    public UserChecklistService(final SystemCheckItemRepository systemCheckItemRepository,
                                final UserChecklistRepository userChecklistRepository,
                                final MemberRepository memberRepository) {
        this.systemCheckItemRepository = systemCheckItemRepository;
        this.userChecklistRepository = userChecklistRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public UserChecklist create(final Long memberId, final String name, final CheckStage stage,
                                final List<Long> systemCheckItemIds) {
        UserChecklist checklist = UserChecklist.create(memberId, name, stage);
        List<SystemCheckItem> requestedItems = findCreatableSystemItems(stage, systemCheckItemIds);

        UserChecklist savedChecklist = userChecklistRepository.save(checklist);
        saveChecklistItems(savedChecklist.getId(), requestedItems);
        return savedChecklist;
    }

    public List<UserChecklistSummaryQuery> findAll(final Long memberId, final CheckStage stage) {
        return userChecklistRepository.findSummariesByMemberId(memberId, stage);
    }

    public UserChecklist findUserChecklistDetails(final Long memberId, final long checklistId) {
        return findOwnedChecklist(memberId, checklistId);
    }

    public List<UserChecklistItemDetail> findItemDetails(final Long memberId, final long checklistId) {
        requireOwnedChecklist(memberId, checklistId);
        return userChecklistRepository.findItemDetails(checklistId);
    }

    @Transactional
    public UserChecklist update(final Long memberId, final long checklistId,
                                final String name, final List<Long> systemCheckItemIds) {
        UserChecklist checklist = findOwnedChecklistForUpdate(memberId, checklistId);
        List<SystemCheckItem> requestedItems = findUpdatableSystemItems(checklist, systemCheckItemIds);

        checklist.rename(name);
        userChecklistRepository.updateName(checklistId, checklist.getName());
        replaceChecklistItems(checklistId, requestedItems);
        return checklist;
    }

    @Transactional
    public void delete(final Long memberId, final long checklistId) {
        findOwnedChecklistForUpdate(memberId, checklistId);
        userChecklistRepository.delete(checklistId);
    }

    private List<SystemCheckItem> findCreatableSystemItems(final CheckStage stage,
                                                           final List<Long> systemCheckItemIds) {
        validateRequestedItems(systemCheckItemIds);
        validateFinalItemCount(systemCheckItemIds.size());

        List<Long> requestedIds = List.copyOf(systemCheckItemIds);
        List<SystemCheckItem> requestedItems = systemCheckItemRepository.findByIdsAndStageInOrder(stage, requestedIds);
        validateItemsExist(requestedIds, requestedItems);
        requireActive(requestedItems);
        return requestedItems;
    }

    private void saveChecklistItems(final long checklistId, final List<SystemCheckItem> systemItems) {
        List<UserChecklistItem> items = createChecklistItems(checklistId, systemItems);
        validateUniqueQuestions(items);
        userChecklistRepository.saveItems(checklistId, items);
    }

    private UserChecklist findOwnedChecklistForUpdate(final Long memberId, final long checklistId) {
        memberRepository.findByIdForUpdate(memberId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND, "회원을 찾을 수 없습니다."));
        return userChecklistRepository.findByIdAndMemberIdForUpdate(checklistId, memberId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CHECKLIST_NOT_FOUND,
                "체크리스트를 찾을 수 없습니다."));
    }

    private List<SystemCheckItem> findUpdatableSystemItems(final UserChecklist checklist,
                                                           final List<Long> systemCheckItemIds) {
        validateRequestedItems(systemCheckItemIds);
        validateFinalItemCount(systemCheckItemIds.size());

        List<Long> requestedIds = List.copyOf(systemCheckItemIds);
        List<SystemCheckItem> requestedItems = systemCheckItemRepository.findByIdsAndStageInOrder(checklist.getStage(), requestedIds);
        validateItemsExist(requestedIds, requestedItems);
        requireInactiveItemsAlreadyIncluded(checklist.getId(), requestedItems);
        return requestedItems;
    }

    private void replaceChecklistItems(final long checklistId, final List<SystemCheckItem> systemItems) {
        List<UserChecklistItem> items = createChecklistItems(checklistId, systemItems);
        validateUniqueQuestions(items);
        userChecklistRepository.deleteItems(checklistId);
        userChecklistRepository.saveItems(checklistId, items);
    }

    private List<UserChecklistItem> createChecklistItems(final long checklistId,
                                                         final List<SystemCheckItem> systemItems) {
        return IntStream.range(0, systemItems.size())
            .mapToObj(index -> UserChecklistItem.create(
                checklistId, systemItems.get(index), index + 1))
            .toList();
    }

    private UserChecklist findOwnedChecklist(final Long memberId, final long checklistId) {
        Optional<UserChecklist> checklist = userChecklistRepository.findByIdAndMemberId(checklistId, memberId);
        return checklist.orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CHECKLIST_NOT_FOUND,
            "체크리스트를 찾을 수 없습니다."));
    }

    private void requireOwnedChecklist(final Long memberId, final long checklistId) {
        if (!userChecklistRepository.existsByIdAndMemberId(checklistId, memberId)) {
            throw new ResourceNotFoundException(ErrorCode.CHECKLIST_NOT_FOUND, "체크리스트를 찾을 수 없습니다.");
        }
    }

    private void requireActive(final List<SystemCheckItem> items) {
        if (items.stream().anyMatch(item -> item.getDeletedAt() != null)) {
            throw new BusinessRuleViolationException(ErrorCode.CHECKLIST_INACTIVE_ITEM_NOT_ALLOWED,
                "비활성 시스템 항목은 새 체크리스트에 추가할 수 없습니다.");
        }
    }

    private void requireInactiveItemsAlreadyIncluded(final long checklistId, final List<SystemCheckItem> items) {
        Set<Long> existingSystemIds = userChecklistRepository.findItems(checklistId).stream()
            .map(UserChecklistItem::getSystemCheckItemId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());

        if (items.stream().anyMatch(item -> item.getDeletedAt() != null && !existingSystemIds.contains(item.getId()))) {
            throw new BusinessRuleViolationException(ErrorCode.CHECKLIST_INACTIVE_ITEM_NOT_ALLOWED,
                "기존 체크리스트에 포함되어 있지 않던 비활성 시스템 항목은 새로 추가할 수 없습니다.");
        }
    }

    private void validateRequestedItems(final List<Long> systemCheckItemIds) {
        if (systemCheckItemIds == null) {
            throw new InvalidInputException(ErrorCode.CHECKLIST_ITEMS_INVALID,
                "체크리스트 항목 목록은 null일 수 없습니다.");
        }

        Set<Long> systemIds = new HashSet<>();
        for (Long systemCheckItemId : systemCheckItemIds) {
            if (systemCheckItemId == null || systemCheckItemId <= 0) {
                throw new InvalidInputException(ErrorCode.CHECKLIST_ITEMS_INVALID,
                    "자취선배가 제공하는 올바른 체크 항목 ID가 필요합니다.");
            }
            if (!systemIds.add(systemCheckItemId)) {
                throw new BusinessRuleViolationException(ErrorCode.DUPLICATE_CHECK_ITEM,
                    "같은 체크 항목을 중복해서 추가할 수 없습니다.");
            }
        }
    }

    private void validateFinalItemCount(final int count) {
        if (count < 1 || count > 30) {
            throw new BusinessRuleViolationException(ErrorCode.CHECKLIST_ITEM_COUNT_OUT_OF_RANGE,
                "체크리스트 항목은 1개 이상 30개 이하여야 합니다.");
        }
    }

    private void validateItemsExist(final List<Long> requestedIds, final List<SystemCheckItem> items) {
        if (requestedIds.size() != items.size()) {
            throw new InvalidInputException(ErrorCode.INVALID_SYSTEM_CHECK_ITEM,
                "존재하지 않거나 단계가 일치하지 않는 시스템 체크 항목이 포함되어 있습니다.");
        }
    }

    private void validateUniqueQuestions(final List<UserChecklistItem> items) {
        Set<String> questions = new HashSet<>();
        if (items.stream().anyMatch(item -> !questions.add(item.getQuestion()))) {
            throw new BusinessRuleViolationException(ErrorCode.DUPLICATE_CHECK_ITEM,
                "같은 체크 항목을 중복해서 추가할 수 없습니다.");
        }
    }
}
