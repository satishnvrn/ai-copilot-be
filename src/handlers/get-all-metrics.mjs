import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.PRODUCT_METRICS_TABLE;

const getDateFilterValue = (period) => {
 const currentDate = new Date().getTime();
  switch (period) {
    case "1d":
      return new Date(currentDate - 24 * 60 * 60 * 1000).toISOString();
    case "1w":
      return new Date(currentDate - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "1m":
      return new Date(currentDate - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(currentDate - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
};

export const getAllMetricsHandler = async (event) => {
  if (event.httpMethod !== "GET") {
    throw new Error(
      `getAllMetrics only accept GET method, you tried: ${event.httpMethod}`
    );
  }
  console.info("received:", JSON.stringify(event));
  const { queryStringParameters } = event;
  const { product, period, defectType, minQuality } = queryStringParameters;

  var params = {
    TableName: tableName,
    IndexName: "product_metric_date_ix",
    KeyConditionExpression: `product = :product and metricDate >= :metricDate`,
    ExpressionAttributeValues: {
      ":product": product,
      ":metricDate": getDateFilterValue(period),
    },
    ScanIndexForward: false,
  };

  if (defectType) {
    params.FilterExpression = "defect = :defectType";
    params.ExpressionAttributeValues[":defectType"] = defectType;
  }

  if (minQuality) {
    params.FilterExpression = params.FilterExpression ? `${params.FilterExpression} and quality >= :minQuality` : "quality >= :minQuality";
    params.ExpressionAttributeValues[":minQuality"] = Number(minQuality);
  }

  try {
    const data = await ddbDocClient.send(new QueryCommand(params));
    var items = data.Items;
  } catch (err) {
    console.log("Error", err);
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        error: err.message,
      }),
    };

    return response;
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify(items),
  };

  console.info(
    `response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`
  );
  return response;
};
