ALTER TABLE members ADD COLUMN merged_into_member_id BIGINT NULL;

ALTER TABLE property_photos DROP FOREIGN KEY fk_property_photos_property_owner;
ALTER TABLE property_photos
    ADD CONSTRAINT fk_property_photos_property_owner
    FOREIGN KEY (property_id, member_id) REFERENCES properties (id, member_id) ON UPDATE CASCADE;
