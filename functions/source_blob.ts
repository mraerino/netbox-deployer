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

      const buf = Buffer.alloc(header.size || 1024);
      stream.on("end", () => {
        const config: HerokuContainerConfig =
          yaml.safeLoad(buf.toString("utf-8")) || {};
        config.build.config.VERSION = version;
        packer.entry({ name: header.name }, yaml.safeDump(config), next);
      });
      stream.on("data", (chunk: Buffer) => {
        buf.write(chunk.toString());
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
    const result = { buf: Buffer.from([]) };
    gzip.on("end", () => resolve(result.buf));
    gzip.on("data", (chunk: Buffer) => {
      console.log("writing bytes:", chunk.length);
      result.buf = Buffer.concat([result.buf, chunk]);
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
