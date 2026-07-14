#!/usr/bin/env python3
"""Serve the threaded WASM build with SharedArrayBuffer security headers."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit
import argparse
import secrets
import shutil
import ssl


class WasmHandler(SimpleHTTPRequestHandler):
    asset_root = None
    asset_token = None

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _asset_path(self):
        parsed = urlsplit(self.path)
        prefix = "/__repsiman_assets__/"
        if not parsed.path.startswith(prefix):
            return None
        if self.asset_root is None or self.asset_token is None:
            return False
        supplied = parse_qs(parsed.query).get("token", [""])[0]
        if not secrets.compare_digest(supplied, self.asset_token):
            return False

        relative = unquote(parsed.path[len(prefix):]).lstrip("/")
        candidate = (self.asset_root / relative).resolve()
        root = self.asset_root.resolve()
        allowed = (
            relative == "SCPH1001.bin" or
            (relative.startswith("PEPSIMAN/") and
             candidate.suffix.lower() in {".cue", ".bin"})
        )
        if not allowed or root not in candidate.parents or not candidate.is_file():
            return False
        return candidate

    def _serve_asset(self, head_only=False):
        asset = self._asset_path()
        if asset is None:
            return False
        if asset is False:
            self.send_error(403, "Private asset URL denied")
            return True

        stat = asset.stat()
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(str(asset)))
        self.send_header("Content-Length", str(stat.st_size))
        self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
        self.end_headers()
        if not head_only:
            with asset.open("rb") as source:
                self.copyfile(source, self.wfile)
        return True

    def copyfile(self, source, outputfile):
        try:
            shutil.copyfileobj(source, outputfile)
        except (BrokenPipeError, ConnectionResetError, ssl.SSLError):
            # A phone refresh/cancel closes an in-flight large track request.
            pass

    def do_GET(self):
        if not self._serve_asset():
            super().do_GET()

    def do_HEAD(self):
        if not self._serve_asset(head_only=True):
            super().do_HEAD()

    def log_request(self, code="-", size="-"):
        # Do not write the private asset token to terminal history/logs.
        clean_path = urlsplit(self.path).path
        self.log_message('"%s %s %s" %s %s',
                         self.command, clean_path, self.request_version,
                         str(code), str(size))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--dir", default=str(Path(__file__).resolve().parents[1] / "build-web"))
    parser.add_argument("--assets-dir", help="Project root containing SCPH1001.bin and PEPSIMAN/")
    parser.add_argument("--token", help="Private asset token (generated when omitted)")
    parser.add_argument("--cert", help="TLS certificate PEM")
    parser.add_argument("--key", help="TLS private key PEM")
    args = parser.parse_args()

    if bool(args.cert) != bool(args.key):
        parser.error("--cert and --key must be supplied together")
    WasmHandler.asset_root = Path(args.assets_dir).resolve() if args.assets_dir else None
    WasmHandler.asset_token = args.token or (secrets.token_urlsafe(18) if args.assets_dir else None)

    def handler(*handler_args, **handler_kwargs):
        return WasmHandler(*handler_args, directory=args.dir, **handler_kwargs)

    server = ThreadingHTTPServer((args.host, args.port), handler)
    server.daemon_threads = True
    scheme = "https" if args.cert else "http"
    if args.cert:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(args.cert, args.key)
        server.socket = context.wrap_socket(server.socket, server_side=True)

    display_host = args.host if args.host not in {"0.0.0.0", "::"} else "<this-mac-ip>"
    url = f"{scheme}://{display_host}:{args.port}/"
    if WasmHandler.asset_token:
        url += f"?remote-assets={WasmHandler.asset_token}"
    print(f"Pepsiman Web: {url}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
