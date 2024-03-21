import { NowRequest, NowResponse } from "@vercel/node";
import { renderToString } from "react-dom/server";
import { decode } from "querystring";
import { Player } from "../components/NowPlaying";
import { nowPlaying } from "../utils/spotify";

export default async function (req: NowRequest, res: NowResponse) {
  try {
    const response = await nowPlaying();

    if (!response || !response.item) {
      // Gérer le cas où la réponse ou l'élément de la réponse est undefined ou vide
      res.status(500).send("Erreur lors de la récupération des données de lecture en cours");
      return;
    }

    const { item, is_playing: isPlaying = false, progress_ms: progress = 0 } = response;

    const params = decode(req.url.split("?")[1]) as any;

    if (params && typeof params.open !== "undefined") {
      if (item.external_urls) {
        res.writeHead(302, {
          Location: item.external_urls.spotify,
        });
        return res.end();
      }
      return res.status(200).end();
    }

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "s-maxage=1, stale-while-revalidate");

    const { duration_ms: duration, name: track } = item;
    const { images = [] } = item.album || {};

    const cover = images[images.length - 1]?.url;
    let coverImg = null;
    if (cover) {
      const buff = await (await fetch(cover)).arrayBuffer();
      coverImg = `data:image/jpeg;base64,${Buffer.from(buff).toString("base64")}`;
    }

    const artist = (item.artists || []).map(({ name }) => name).join(", ");
    const text = renderToString(
      Player({ cover: coverImg, artist, track, isPlaying, progress, duration })
    );
    return res.status(200).send(text);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).send("Erreur interne du serveur");
  }
}
