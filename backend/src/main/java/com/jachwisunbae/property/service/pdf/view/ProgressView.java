package com.jachwisunbae.property.service.pdf.view;

/**
 * 체크리스트 한 단계의 진행. 적용하지 않은 단계는 {@code applied}가 false이고 숫자는 모두 0이다.
 */
public record ProgressView(boolean applied, int completedCount, int totalCount, int goodCount,
                           int cautionCount, int unconfirmedCount, int progressRate) {

    public static ProgressView notApplied() {
        return new ProgressView(false, 0, 0, 0, 0, 0, 0);
    }
}
