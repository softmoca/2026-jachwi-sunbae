ALTER TABLE system_check_items
    ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'OTHER';

-- 기존 제공 항목은 참조와 기록을 보존한 채 신규 선택에서 제외한다.
-- 계약 전 항목은 다시 등록하지 않는다. 공통 stage 컬럼과 제약조건은 유지한다.
UPDATE system_check_items
SET deleted_at = NOW(6)
WHERE stage IN ('ON_SITE', 'PRE_CONTRACT') AND deleted_at IS NULL;

-- 새 ID를 사용하고 CORE·OPTIONAL 각각 카테고리 순서대로 등록한다.
INSERT INTO system_check_items (stage, item_type, category, question, display_order, created_at, deleted_at) VALUES
('ON_SITE', 'CORE', 'SECURITY', '현관문 잠금장치 잘 작동하는지', 1, NOW(6), NULL),
('ON_SITE', 'CORE', 'SECURITY', '공동 현관 출입 통제되는지', 2, NOW(6), NULL),
('ON_SITE', 'CORE', 'WINDOW_LIGHT', '햇빛 잘 들어오는지', 3, NOW(6), NULL),
('ON_SITE', 'CORE', 'WINDOW_LIGHT', '창문·방충망 상태 괜찮은지', 4, NOW(6), NULL),
('ON_SITE', 'CORE', 'WATER_BATHROOM', '싱크대·샤워기 물 잘 나오는지', 5, NOW(6), NULL),
('ON_SITE', 'CORE', 'WATER_BATHROOM', '온수 잘 나오는지', 6, NOW(6), NULL),
('ON_SITE', 'CORE', 'WATER_BATHROOM', '배수구·변기 물 잘 내려가는지', 7, NOW(6), NULL),
('ON_SITE', 'CORE', 'ROOM_CONDITION', '벽지·창틀에 곰팡이 있는지', 8, NOW(6), NULL),
('ON_SITE', 'CORE', 'ROOM_CONDITION', '천장·벽에 물 얼룩 있는지', 9, NOW(6), NULL),
('ON_SITE', 'CORE', 'ROOM_CONDITION', '외부 소음 심하지 않은지', 10, NOW(6), NULL),
('ON_SITE', 'CORE', 'BASIC_OPTIONS', '에어컨·냉장고 작동하는지', 11, NOW(6), NULL),
('ON_SITE', 'CORE', 'BASIC_OPTIONS', '옵션·수납공간 충분한지', 12, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'SECURITY', '방충망·방범창 상태 괜찮은지', 13, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'WATER_BATHROOM', '샤워 공간 충분한지', 14, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'ROOM_CONDITION', '콘센트 위치·개수 충분한지', 15, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'ROOM_CONDITION', '휴대전화 신호 잘 잡히는지', 16, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'ROOM_CONDITION', '인터넷 설치·이용 가능한지', 17, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'BASIC_OPTIONS', '가구 배치·수납공간 충분한지', 18, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'BASIC_OPTIONS', '세탁기·냉장고 정상 작동하는지', 19, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'OTHER', '복도·계단·엘리베이터 관리 상태 괜찮은지', 20, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'OTHER', '주차·자전거 보관 공간 있는지', 21, NOW(6), NULL),
('ON_SITE', 'OPTIONAL', 'OTHER', '쓰레기 배출·분리수거 방법 확인했는지', 22, NOW(6), NULL);
