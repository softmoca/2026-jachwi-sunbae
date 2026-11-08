package com.jachwisunbae.architecture.support;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvent;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.EvaluationResult;
import java.util.Collection;
import java.util.List;

public final class KoreanArchRule implements ArchRule {

    private final ArchRule delegate;

    public KoreanArchRule(ArchRule delegate) {
        this.delegate = delegate;
    }

    @Override
    public EvaluationResult evaluate(JavaClasses classes) {
        EvaluationResult original = delegate.evaluate(classes);
        ConditionEvents events = ConditionEvents.Factory.create();
        original.handleViolations((Collection<Object> objects, String message) ->
                events.add(new KoreanViolation(List.copyOf(objects), KoreanViolationMessages.describe(message, getDescription()), true)));
        return new EvaluationResult(this, events, original.getPriority());
    }

    @Override
    public void check(JavaClasses classes) {
        ArchRule.Assertions.check(this, classes);
    }

    @Override
    public String getDescription() {
        return delegate.getDescription();
    }

    @Override
    public ArchRule because(String reason) {
        return new KoreanArchRule(delegate.because(reason));
    }

    @Override
    public ArchRule as(String description) {
        return new KoreanArchRule(delegate.as(description));
    }

    @Override
    public ArchRule allowEmptyShould(boolean allowEmptyShould) {
        return new KoreanArchRule(delegate.allowEmptyShould(allowEmptyShould));
    }

    private record KoreanViolation(Collection<?> objects, String message, boolean isViolation) implements ConditionEvent {

        @Override
        public ConditionEvent invert() {
            return new KoreanViolation(objects, message, !isViolation);
        }

        @Override
        public List<String> getDescriptionLines() {
            return List.of(message);
        }

        @Override
        public void handleWith(Handler handler) {
            handler.handle(objects, message);
        }
    }
}
