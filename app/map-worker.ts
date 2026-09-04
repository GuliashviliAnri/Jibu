import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// Bundle the worker and its imports explicitly; dependency-relative URLs are
// otherwise lost when MapLibre's ESM entry is bundled for production.
setWorkerUrl(workerUrl);
