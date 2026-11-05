package com.jachwisunbae.streetmemo.repository;

import com.jachwisunbae.streetmemo.domain.StreetMemo;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface StreetMemoRepository {

    StreetMemo save(StreetMemo streetMemo);

    List<StreetMemo> findAllWithin(BigDecimal minLatitude, BigDecimal maxLatitude,
                                  BigDecimal minLongitude, BigDecimal maxLongitude);

    List<StreetMemo> findAllByAdminDongCode(String adminDongCode);

    Optional<StreetMemo> findByIdForUpdate(long id);

    int delete(StreetMemo streetMemo);
}
