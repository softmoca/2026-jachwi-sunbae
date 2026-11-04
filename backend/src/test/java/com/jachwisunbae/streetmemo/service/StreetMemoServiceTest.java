package com.jachwisunbae.streetmemo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.service.MemberService;
import com.jachwisunbae.streetmemo.domain.StreetMemo;
import com.jachwisunbae.streetmemo.domain.StreetMemoPreference;
import com.jachwisunbae.streetmemo.repository.StreetMemoRepository;
import com.jachwisunbae.transit.service.AdminDongFinder;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StreetMemoServiceTest {

    @Mock
    private StreetMemoRepository repository;
    @Mock
    private MemberService memberService;
    @Mock
    private AdminDongFinder adminDongFinder;

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-26T12:00:00Z"), ZoneOffset.UTC);

    @Test
    @DisplayName("실제 삭제된 행이 없으면 삭제 성공으로 반환하지 않는다")
    void rejectsUnappliedDeletion() {
        LocalDateTime now = LocalDateTime.now(clock);
        StreetMemo memo = StreetMemo.reconstruct(10L, 1L, new BigDecimal("37.5"), new BigDecimal("127.0"), null,
                "동네 메모", StreetMemoPreference.LIKE, now, now, null);
        when(repository.findByIdForUpdate(10L)).thenReturn(Optional.of(memo));
        when(repository.delete(memo)).thenReturn(0);
        StreetMemoService service = new StreetMemoService(repository, memberService, adminDongFinder, clock);

        assertThatThrownBy(() -> service.delete(1L, 10L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("작성할 때 메모 위치로 찾은 행정동 코드를 함께 저장한다")
    void savesAdminDongCodeFoundByLocation() {
        BigDecimal latitude = new BigDecimal("37.5");
        BigDecimal longitude = new BigDecimal("127.0");
        when(adminDongFinder.findCode(latitude, longitude)).thenReturn(Optional.of("11680640"));
        when(repository.save(any())).thenAnswer(call -> saved(call.getArgument(0)));
        StreetMemoService service = new StreetMemoService(repository, memberService, adminDongFinder, clock);

        service.create(1L, latitude, longitude, "동네 메모", StreetMemoPreference.LIKE);

        ArgumentCaptor<StreetMemo> captor = ArgumentCaptor.forClass(StreetMemo.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getAdminDongCode()).isEqualTo("11680640");
    }

    @Test
    @DisplayName("행정동을 찾지 못해도 행정동 없이 메모를 저장한다")
    void savesWithoutAdminDongWhenNotFound() {
        BigDecimal latitude = new BigDecimal("33.0");
        BigDecimal longitude = new BigDecimal("150.0");
        when(adminDongFinder.findCode(latitude, longitude)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(call -> saved(call.getArgument(0)));
        StreetMemoService service = new StreetMemoService(repository, memberService, adminDongFinder, clock);

        service.create(1L, latitude, longitude, "동네 메모", StreetMemoPreference.DISLIKE);

        ArgumentCaptor<StreetMemo> captor = ArgumentCaptor.forClass(StreetMemo.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getAdminDongCode()).isNull();
    }

    @Test
    @DisplayName("잘못된 좌표는 행정동을 찾기 전에 거부한다")
    void rejectsInvalidLocationBeforeFindingAdminDong() {
        StreetMemoService service = new StreetMemoService(repository, memberService, adminDongFinder, clock);

        assertThatThrownBy(() -> service.create(1L, new BigDecimal("91"), new BigDecimal("127.0"), "동네 메모",
                StreetMemoPreference.LIKE)).isInstanceOf(InvalidInputException.class);

        verifyNoInteractions(adminDongFinder, repository);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"1168064", "116806400", "1168064a"})
    @DisplayName("8자리 숫자가 아닌 행정동 코드는 저장소를 조회하지 않고 거부한다")
    void rejectsInvalidAdminDongCode(final String adminDongCode) {
        StreetMemoService service = new StreetMemoService(repository, memberService, adminDongFinder, clock);

        assertThatThrownBy(() -> service.findAllInAdminDong(1L, adminDongCode))
                .isInstanceOfSatisfying(InvalidInputException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.STREET_MEMO_QUERY_INVALID));

        verifyNoInteractions(repository);
    }

    private StreetMemo saved(final StreetMemo memo) {
        return StreetMemo.reconstruct(10L, memo.getMemberId(), memo.getLatitude(), memo.getLongitude(),
                memo.getAdminDongCode(), memo.getMemo(), memo.getPreference(), memo.getCreatedAt(),
                memo.getUpdatedAt(), null);
    }
}
