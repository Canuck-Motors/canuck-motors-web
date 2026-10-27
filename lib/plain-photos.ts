// Products whose photo is shown unedited (no deeper-blacks filter)
export const PLAIN_PHOTO_SKUS = ["cm1204400"];
export const isPlainPhoto = (sku?: string | null) => PLAIN_PHOTO_SKUS.includes((sku ?? "").toLowerCase());
