package com.jachwisunbae.transit.service;

import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

// 웹 서버가 뜰 때 행정동 경계를 미리 읽어, 첫 거리 메모 작성이 경계를 읽느라 기다리지 않게 한다.
// 경계를 읽지 못해도 서버는 그대로 띄우고, 메모를 작성할 때 다시 읽는다.
@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class AdminDongFinderPreloader {

    private static final Logger LOG = LoggerFactory.getLogger(AdminDongFinderPreloader.class);

    private final AdminDongFinder adminDongFinder;

    public AdminDongFinderPreloader(final AdminDongFinder adminDongFinder) {
        this.adminDongFinder = adminDongFinder;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void preload() {
        long startedAt = System.currentTimeMillis();
        try {
            adminDongFinder.findCode(BigDecimal.ZERO, BigDecimal.ZERO);
            LOG.info("행정동 경계를 메모리에 올렸습니다. elapsedMillis={}", System.currentTimeMillis() - startedAt);
        } catch (RuntimeException exception) {
            LOG.warn("행정동 경계를 미리 읽지 못했습니다. 거리 메모를 작성할 때 다시 읽습니다. reason={}",
                    exception.getMessage());
        }
    }
}
