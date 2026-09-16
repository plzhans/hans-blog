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

  /**
   * 로컬 파일 내용을 Notion 에 업로드하고 file_upload ID 를 반환
   *
   * 업로드된 파일은 1시간 안에 블록이나 프로퍼티에 붙이지 않으면 만료된다.
   *
   * @param {Buffer} buffer - 업로드할 파일 내용
   * @param {string} filename - 파일 이름 (확장자 포함)
   * @param {string} contentType - MIME 타입 (예: image/png)
   * @returns {Promise<string>} file_upload ID
   */
  async uploadFile(buffer, filename, contentType) {
    const upload = await this.notion.fileUploads.create({
      mode: "single_part",
      filename,
      content_type: contentType,
    });
    await this.notion.fileUploads.send({
      file_upload_id: upload.id,
      file: { filename, data: new Blob([buffer], { type: contentType }) },
    });
    return upload.id;
  }

  /**
   * 업로드된 파일을 이미지 블록으로 페이지에 추가
   * @param {string} pageId - Notion 페이지 ID
   * @param {string} fileUploadId - uploadFile 이 반환한 ID
   * @param {string} [caption=""] - 이미지 캡션 (Hugo alt 텍스트로 쓰인다)
   * @param {"start"|"end"} [position="start"] - 페이지 내 삽입 위치
   * @returns {Promise<Object>} 생성된 블록 객체
   */
  async appendImageBlock(pageId, fileUploadId, caption = "", position = "start") {
    const resp = await this.notion.blocks.children.append({
      block_id: pageId,
      position: { type: position },
      children: [
        {
          type: "image",
          image: {
            type: "file_upload",
            file_upload: { id: fileUploadId },
            caption: caption ? [{ type: "text", text: { content: caption } }] : [],
          },
        },
      ],
    });
    return resp.results?.[0];
  }

  /**
   * 기존 이미지 블록의 내용을 업로드된 파일로 교체
   * @param {string} blockId - 교체할 이미지 블록 ID
   * @param {string} fileUploadId - uploadFile 이 반환한 ID
   * @param {string} [caption] - 새 캡션. 생략하면 기존 캡션을 유지
   * @returns {Promise<Object>} 갱신된 블록 객체
   */
  async updateImageBlock(blockId, fileUploadId, caption) {
    const image = { file_upload: { id: fileUploadId } };
    if (caption !== undefined) {
      image.caption = caption ? [{ type: "text", text: { content: caption } }] : [];
    }
    return this.notion.blocks.update({ block_id: blockId, image });
  }

  /**
   * 페이지 최상위에서 첫 번째 이미지 블록을 찾는다
   *
   * 대표 이미지는 본문 첫 이미지 블록이라는 규칙(NotionExportService 의
   * firstImagePath)을 그대로 따른다. 중첩 블록은 훑지 않는다.
   *
   * @param {string} pageId - Notion 페이지 ID
   * @returns {Promise<Object|null>} 첫 이미지 블록 또는 null
   */
  async findFirstImageBlock(pageId) {
    const children = await this.listAllChildren(pageId);
    return children.find((block) => block.type === "image") ?? null;
  }
}
