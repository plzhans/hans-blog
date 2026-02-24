import path from "node:path";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const SERVICE_ACCOUNT_KEY_PATH = path.resolve("config/google_service_account.json");

/**
 * GA4 Data API를 통해 데이터를 조회하는 서비스
 */
export class GoogleAnalyticsService {
  /**
   * @param {string} propertyId - GA4 속성 ID (숫자)
   * @param {string} [keyFilename] - 서비스 계정 JSON 키 경로
   */
  constructor(propertyId, keyFilename = SERVICE_ACCOUNT_KEY_PATH) {
    this.propertyId = propertyId;
    this.client = new BetaAnalyticsDataClient({ keyFilename });
  }

  /**
   * post_slug 별 이벤트 카운트 상위 N개 조회
   * @param {object} [options]
   * @param {number} [options.limit=10]
   * @param {string} [options.startDate='30daysAgo']
   * @param {string} [options.endDate='today']
   * @param {string} [options.eventName='post_view']
   * @param {string|null} [options.pagePathPrefix] - 언어별 URL 접두사 필터 (예: '/posts/', '/en/posts/')
   * @returns {Promise<Array<{slug: string, count: number}>>}
   */
  async getTopPostSlugs({ limit = 10, startDate = "30daysAgo", endDate = "today", eventName = "post_view", pagePathPrefix = null } = {}) {
    const eventFilter = {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: eventName },
      },
    };

    const dimensionFilter = pagePathPrefix
      ? {
          andGroup: {
            expressions: [
              eventFilter,
              {
                filter: {
                  fieldName: "pagePath",
                  stringFilter: { matchType: "BEGINS_WITH", value: pagePathPrefix },
                },
              },
            ],
          },
        }
      : eventFilter;

    const [response] = await this.client.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "customEvent:post_slug" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter,
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit,
    });

    return (response.rows ?? []).map((row) => ({
      slug: row.dimensionValues[0].value,
      count: parseInt(row.metricValues[0].value, 10),
    }));
  }
}
