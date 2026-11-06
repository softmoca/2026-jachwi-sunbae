package com.jachwisunbae.property.service.pdf.view;

import java.util.List;
import java.util.stream.IntStream;

/**
 * @param coverPhoto 표지 카드에 쓰는 사진. 대표 사진이 없으면 첫 사진이고, 사진이 없으면 null이다.
 */
public record PropertyView(int index, int total, String name, String deposit, String monthlyRent, String address,
                           PhotoView coverPhoto, List<KeyValue> basics, List<PhotoView> photos, String memo,
                           List<StageView> stages) {

    private static final int PHOTOS_PER_ROW = 2;

    /** PDF에서 사진을 한 줄에 두 장씩 놓기 위해 묶는다. openhtmltopdf에는 grid가 없어 표의 줄로 나눈다. */
    public List<List<PhotoView>> photoRows() {
        return IntStream.range(0, (photos.size() + PHOTOS_PER_ROW - 1) / PHOTOS_PER_ROW)
            .mapToObj(row -> photos.subList(row * PHOTOS_PER_ROW,
                Math.min(photos.size(), (row + 1) * PHOTOS_PER_ROW)))
            .toList();
    }
}
