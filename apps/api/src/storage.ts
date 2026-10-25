/** The one module that talks to photo storage (extensibility.md, rule 1). R2 today. */
export type PhotoStore = {
  /** Deletes each object. A key that is already gone is not an error, so a retry is safe. */
  deleteObjects(keys: string[]): Promise<void>
}

/** Until T-16a adds the R2 client. No upload path exists yet, so no account has keys,
 *  and a key here means a photo we cannot remove — fail rather than leave it. */
export const unconfiguredPhotoStore: PhotoStore = {
  async deleteObjects(keys) {
    if (keys.length > 0) throw new Error('photo storage is not configured')
  },
}
