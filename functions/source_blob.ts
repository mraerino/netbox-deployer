import request from "request";
import tar from "tar-stream";
import yaml from "js-yaml";
import zlib from "zlib";
import fs from "fs";

const templateRepo = "https://github.com/mraerino/netbox-heroku";
const templateRef = "main";

interface HerokuContainerConfig {
  build: {
    config: {
      VERSION: string;
    };
  };
}

const transformArchive = (tarURL: string, version: string) =>
  new Promise<Buffer>((resolve, reject) => {
    const packer = tar.pack();

    const extractor = tar.extract();
    extractor.on("error", reject);
    extractor.on("entry", (header, stream, next) => {
      const parts = header.name.split("/");
      if (parts.length < 2 || parts[1] !== "heroku.yml") {
        stream.pipe(packer.entry(header, next));
        return;
      }

      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      stream.on("end", () => {
        const buf = Buffer.concat(chunks);
        try {
          const config: HerokuContainerConfig =
            yaml.safeLoad(buf.toString("utf-8")) || {};
          config.build.config.VERSION = version;
          packer.entry({ name: header.name }, yaml.safeDump(config), next);
        } catch (e) {
          console.error("Error while parsing yaml:", e);
          console.log("File content:", buf.toString("utf-8"));
          reject("Failed parsing yaml");
        }
      });
    });
    extractor.on("finish", function() {
      console.log("finalizing tarball...");
      packer.finalize();
    });

    const gunzip = zlib.createGunzip();

    request(tarURL)
      .once("response", ({ statusCode }) => {
        if (statusCode !== 200) {
          reject(new Error(`Invalid status code: ${statusCode}`));
        }
      })
      .on("error", reject)
      .pipe(gunzip)
      .pipe(extractor)
      .on("error", reject);

    const gzip = zlib.createGzip();
    gzip.on("error", reject);
    const result: Buffer[] = [];
    gzip.on("end", () => resolve(Buffer.concat(result)));
    gzip.on("data", (chunk: Buffer) => {
      console.log("writing bytes:", chunk.length);
      result.push(chunk);
    });
    packer.pipe(gzip);
  });

export const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<AWSLambda.APIGatewayProxyResult> => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 400, body: "Invalid request" };
  }

  if (
    event.queryStringParameters === null ||
    !("version" in event.queryStringParameters)
  ) {
    return { statusCode: 400, body: "Missing request params" };
  }

  const version = event.queryStringParameters.version;

  const tarURL = `${templateRepo}/tarball/${templateRef}`;

  console.log("making request to:", tarURL);
  const result = await transformArchive(tarURL, version);
  console.log("result len:", result.length);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/x-gzip"
    },
    body: result.toString("base64"),
    isBase64Encoded: true
  };
};
