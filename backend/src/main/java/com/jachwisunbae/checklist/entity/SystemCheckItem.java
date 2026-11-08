package com.jachwisunbae.checklist.entity;

import lombok.Getter;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;

import java.time.LocalDateTime;

@Getter
public class SystemCheckItem {

    private static final int MAX_QUESTION_LENGTH = 200;
    private final Long id;
    private final CheckStage stage;
    private final CheckItemType itemType;
    private final CheckItemCategory category;
    private final String question;
    private final LocalDateTime deletedAt;

    private SystemCheckItem(final Long id, final CheckStage stage, final CheckItemType itemType,
                            final CheckItemCategory category, final String question, final LocalDateTime deletedAt) {
        this.id = id;
        this.stage = stage;
        this.itemType = itemType;
        this.category = category;
        this.question = question;
        this.deletedAt = deletedAt;
    }

    public static SystemCheckItem reconstruct(final Long id, final CheckStage stage,
                                              final CheckItemType itemType, final CheckItemCategory category,
                                              final String question,
                                              final LocalDateTime deletedAt) {
        // 시스템 체크 항목은 서버가 제공하는 시드 데이터다. 값이 어긋나면 서버 데이터 문제다.
        return new SystemCheckItem(id, validateStage(stage), validateItemType(itemType),
                validateCategory(category), validateQuestion(question), deletedAt);
    }

    private static CheckStage validateStage(final CheckStage stage) {
        if (stage == null) {
            throw new IllegalArgumentException("체크 단계는 필수입니다.");
        }
        return stage;
    }

    private static CheckItemType validateItemType(final CheckItemType itemType) {
        if (itemType == null) {
            throw new IllegalArgumentException("시스템 항목 유형은 필수입니다.");
        }
        return itemType;
    }

    private static CheckItemCategory validateCategory(final CheckItemCategory category) {
        if (category == null) {
            throw new IllegalArgumentException("시스템 항목 카테고리는 필수입니다.");
        }
        return category;
    }

    private static String validateQuestion(final String question) {
        if (question == null || question.isBlank() || question.trim().length() > MAX_QUESTION_LENGTH) {
            throw new IllegalArgumentException("질문은 trim 후 1자 이상 200자 이하여야 합니다.");
        }
        return question.trim();
    }
}
