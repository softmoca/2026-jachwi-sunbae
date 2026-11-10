package com.jachwisunbae.auth.service;

import com.jachwisunbae.auth.client.OAuthProviderClient;
import com.jachwisunbae.auth.repository.OAuthUnlinkRequestRepository;
import com.jachwisunbae.auth.repository.OAuthUnlinkRequestRepository.UnlinkRequest;
import com.jachwisunbae.auth.token.OAuthTokenCipher;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

// 회원 탈퇴 때 남긴 요청으로 카카오 연결 끊기와 Apple 토큰 철회를 처리한다.
// 성공하면 요청과 함께 보관하던 식별값·토큰을 지운다. 실패하면 간격을 늘려 다시 시도하고,
// 끝내 실패하면 제공자 정보를 더 보관하지 않도록 요청을 지우고 운영자가 확인할 수 있게 ERROR로 남긴다.
@Slf4j
@Service
public class OAuthUnlinkService {

    private static final int BATCH_SIZE = 20;
    private static final int MAX_ATTEMPTS = 12;
    private static final Duration LEASE = Duration.ofMinutes(5);
    private static final Duration MAX_BACKOFF = Duration.ofHours(12);

    private final OAuthUnlinkRequestRepository requests;
    private final OAuthProviderClient providers;
    private final OAuthTokenCipher cipher;
    private final Clock clock;

    public OAuthUnlinkService(OAuthUnlinkRequestRepository requests, OAuthProviderClient providers,
                              OAuthTokenCipher cipher, Clock clock) {
        this.requests = requests;
        this.providers = providers;
        this.cipher = cipher;
        this.clock = clock;
    }

    // 처리한 요청 수를 반환한다. 다른 서버가 선점한 요청은 건너뛴다.
    public int processDue() {
        LocalDateTime now = LocalDateTime.now(clock);
        int processed = 0;
        for (Long id : requests.findDueIds(now, BATCH_SIZE)) {
            if (requests.claim(id, now, now.plus(LEASE))) {
                process(requests.get(id));
                processed++;
            }
        }
        return processed;
    }

    private void process(UnlinkRequest request) {
        try {
            String token = request.encryptedRefreshToken();
            providers.unlink(request.provider(), request.subject(), request.clientId(),
                    token == null ? null : cipher.decrypt(token));
            requests.delete(request.id());
            log.info("OAuth unlink completed: requestId={}, provider={}", request.id(), request.provider());
        } catch (RuntimeException exception) {
            int attempts = request.attempts() + 1;
            if (attempts >= MAX_ATTEMPTS) {
                requests.delete(request.id());
                log.error("OAuth unlink abandoned: requestId={}, provider={}, attempts={}, type={}", request.id(),
                        request.provider(), attempts, exception.getClass().getSimpleName(), exception);
                return;
            }
            LocalDateTime next = LocalDateTime.now(clock).plus(backoff(attempts));
            requests.reschedule(request.id(), attempts, next);
            log.warn("OAuth unlink failed: requestId={}, provider={}, attempts={}, nextAttemptAt={}, reason={}",
                    request.id(), request.provider(), attempts, next, exception.getMessage());
        }
    }

    // 1분, 2분, 4분 … 최대 12시간. 12번 시도하는 동안 하루 남짓 다시 시도한다.
    private static Duration backoff(int attempts) {
        Duration delay = Duration.ofMinutes(1L << Math.min(attempts - 1, 20));
        return delay.compareTo(MAX_BACKOFF) > 0 ? MAX_BACKOFF : delay;
    }
}
