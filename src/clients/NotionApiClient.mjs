/**
 * Notion API 클라이언트 래퍼
 */
export class NotionApiClient {
  /**
   * @param {import("@notionhq/client").Client} notionClient - Notion SDK 클라이언트
   * @param {string} authToken - Notion API 인증 토큰
   */
  constructor(notionClient, authToken) {
    this.notion = notionClient;
    this.authToken = authToken;
  }

  /**
   * 페이지 정보를 조회
   * @param {string} pageId - Notion 페이지 ID
   * @returns {Promise<Object>} Notion 페이지 객체
   */
  async retrievePage(pageId) {
    return this.notion.pages.retrieve({ page_id: pageId });
  }

  /**
   * 데이터베이스를 쿼리하여 페이지 목록 조회
   * @param {string} databaseId - Notion 데이터베이스 ID
   * @param {Object} [params={}] - 추가 쿼리 파라미터 (filter, sorts 등)
   * @returns {Promise<Object>} 쿼리 응답 (results, has_more, next_cursor 포함)
   */
  async queryDatabase(databaseId, params = {}) {
    return this.notion.dataSources.query({ data_source_id: databaseId, ...params });
  }

  /**
   * 페이지 속성을 업데이트
   * @param {string} pageId - Notion 페이지 ID
   * @param {Object} properties - 업데이트할 속성 객체
   * @returns {Promise<Object>} 업데이트된 페이지 객체
   */
  async updatePageProperties(pageId, properties) {
    return this.notion.pages.update({ page_id: pageId, properties });
  }

  /**
   * 블록의 모든 하위 블록을 페이징하여 조회
   * @param {string} blockId - Notion 블록 ID
   * @returns {Promise<Object[]>} 하위 블록 객체 배열
   */
  async listAllChildren(blockId) {
    let results = [];
    let cursor = undefined;

    while (true) {
      const resp = await this.notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      });
      results = results.concat(resp.results || []);
      if (!resp.has_more) break;
      cursor = resp.next_cursor;
    }
    return results;
  }
}
