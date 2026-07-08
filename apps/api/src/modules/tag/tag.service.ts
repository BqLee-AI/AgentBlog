import { tagRepository } from './tag.repository'

export const tagService = {
  async list() {
    return tagRepository.list()
  },
}
