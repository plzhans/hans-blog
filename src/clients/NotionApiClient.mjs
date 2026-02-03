export class NotionApiClient {
  /**
   * @param {import("@notionhq/client").Client} notionClient
   * @param {string} authToken
   */
  constructor(notionClient, authToken) {
    this.notion = notionClient;
    this.authToken = authToken;
  }

  async retrievePage(pageId) {
    return this.notion.pages.retrieve({ page_id: pageId });
  }

  async queryDatabase(databaseId, params = {}) {
    return this.notion.dataSources.query({ data_source_id: databaseId, ...params });
  }

  async updatePageProperties(pageId, properties) {
    return this.notion.pages.update({ page_id: pageId, properties });
  }

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
