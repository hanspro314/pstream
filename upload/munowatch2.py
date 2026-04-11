#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   ██████╗ ███████╗███████╗██╗███╗   ███╗███████╗███████╗███████╗███████╗  ║
║  ██╔════╝ ██╔════╝██╔════╝██║████╗ ████║██╔════╝██╔════╝██╔════╝██╔════╝  ║
║  ██║  ███╗█████╗  ███████╗██║██╔████╔██║█████╗  ███████╗███████╗███████╗  ║
║  ██║   ██║██╔══╝  ╚════██║██║██║╚██╔╝██║██╔══╝  ╚════██║╚════██║╚════██║  ║
║  ╚██████╔╝███████╗███████║██║██║ ╚═╝ ██║███████╗███████║███████║███████║  ║
║   ╚═════╝ ╚══════╝╚══════╝╚═╝╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝  ║
║                                                                            ║
║             Munowatch CLI  —  Movies on Demand                             ║
║             https://hamcodz.duckdns.org                                    ║
║                                                                            ║
║   Developed with ❤ by Hamcodz Hamza                                       ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

A feature-rich, user-friendly CLI tool for searching, browsing, previewing,
and downloading movies from Munowatch.

Quick Start (just run it!):
    python munowatch.py                        → Opens the interactive menu
    python munowatch.py --search "Avengers"    → Search & pick from results
    python munowatch.py --dashboard            → See what's trending

Full Commands:
    python munowatch.py --dashboard                Show dashboard with all categories
    python munowatch.py --search "query"           Search movies by name
    python munowatch.py --preview VID              Get download URL & details
    python munowatch.py --download VID             Download a movie
    python munowatch.py --browse TYPE              Browse by category
    python munowatch.py --categories               List all categories
    python munowatch.py --list PIPE PID            List movies in a category
    python munowatch.py --shows PIPE PID           List shows/series
    python munowatch.py --episodes VID SCODE NO    Get episodes for a show
    python munowatch.py --download VID1 VID2 ...   Batch download

Developer: Hamcodz Hamza
Website:   https://munowatch.co
Requires:  requests (pip install requests)
Optional:  rich (pip install rich for beautiful colors), aria2c (for fast downloads)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
import time
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ─── Try importing rich for beautiful output ──────────────────────────────────
try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.progress import (
        BarColumn,
        DownloadColumn,
        FileSizeColumn,
        Progress,
        RemainingTimeColumn,
        SpeedColumn,
        TextColumn,
        TimeElapsedColumn,
        TransferSpeedColumn,
    )
    from rich.table import Table
    from rich.text import Text
    from rich.columns import Columns
    from rich import box

    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

# ─── Developer Credit ────────────────────────────────────────────────────────

DEVELOPER = "Hamcodz Hamza"
VERSION = "2.0.0"
WEBSITE = "https://hamcodz.duckdns.org"

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_URL = "https://munoapi.com/api"
API_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ1c2VybmFtZSI6IkFuZHJvaWQgVFYiLCJhcHBuYW1lIjoiTXVub3dhdGNoIFRWIiwiaG9zdCI6"
    "Im11bm93YXRjaC5jbyIsImFwcHNlY3JldCI6IjAyMjc3OGU0MThhZDY4ZmZkYTlhYTRmYWIxODky"
    "ZmZmIiwiYWN0aXZhdGVkIjoiMSIsImV4cCI6MTcwNzM2ODQwMH0.unlPnEzptg6VFHs7WWm213bR"
    "HHNxYuAN2eZQvjtPKL0"
)
USER_AGENT = "Android IOS v3.0"
USER_ID = "82717"

HEADERS = {
    "X-Api-Key": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "User-Agent": USER_AGENT,
    "Accept": "application/json",
}

KNOWN_CATEGORIES = {
    4: "Latest on Munowatch",
    17: "Continue watching",
    18: "Latest Uploads",
    20: "Favourites",
    1: "My List",
    23: "Last watched episodes",
    6: "You may also like",
    22: "Most Liked",
    5: "Action",
    9: "Sci Fi",
    3: "Romance",
    10: "Horror",
    8: "Drama",
}

CATEGORY_ALIASES = {
    "latest": 4,
    "continue": 17,
    "uploads": 18,
    "favourites": 20,
    "favorites": 20,
    "mylist": 1,
    "my-list": 1,
    "episodes": 23,
    "liked": 6,
    "mostliked": 22,
    "most-liked": 22,
    "action": 5,
    "scifi": 9,
    "sci-fi": 9,
    "romance": 3,
    "horror": 10,
    "drama": 8,
}

DEFAULT_DOWNLOAD_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "Munowatch")


# ─── Color / Output helpers ──────────────────────────────────────────────────

class Colors:
    """ANSI color codes for terminal output (fallback when rich is unavailable)."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    UNDERLINE = "\033[4m"

    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    GRAY = "\033[90m"

    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"
    BG_MAGENTA = "\033[45m"
    BG_CYAN = "\033[46m"

    # Bright variants
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"
    BRIGHT_WHITE = "\033[97m"


def cprint(text: str = "", color: str = Colors.RESET, bold: bool = False, end: str = "\n") -> None:
    """Print colored text (plain fallback)."""
    if bold:
        text = f"{Colors.BOLD}{text}"
    print(f"{color}{text}{Colors.RESET}", end=end)


def print_banner() -> None:
    """Print the Munowatch CLI banner with developer credit."""
    banner = r"""
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   ██████╗ ███████╗███████╗██╗███╗   ███╗███████╗███████╗    ║
    ║  ██╔════╝ ██╔════╝██╔════╝██║████╗ ████║██╔════╝██╔════╝    ║
    ║  ██║  ███╗█████╗  ███████╗██║██╔████╔██║█████╗  ███████╗    ║
    ║  ██║   ██║██╔══╝  ╚════██║██║██║╚██╔╝██║██╔══╝  ╚════██║    ║
    ║  ╚██████╔╝███████╗███████║██║██║ ╚═╝ ██║███████╗███████║    ║
    ║   ╚═════╝ ╚══════╝╚══════╝╚═╝╚═╝     ╚═╝╚══════╝╚══════╝    ║
    ║                                                              ║
    ║          Movies on Demand  ·  v{version}                     ║
    ║          {website}                                          ║
    ║                                                              ║
    ║          Developed with ♥ by {developer}                     ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
""".format(version=VERSION, website=WEBSITE, developer=DEVELOPER)

    if HAS_RICH:
        console.print(Panel(
            f"[bold bright_cyan]{Text(banner)}[/]",
            border_style="bright_cyan",
            padding=(0, 1),
        ))
    else:
        cprint(banner, Colors.BRIGHT_CYAN)


def print_success(msg: str) -> None:
    if HAS_RICH:
        console.print(f"[bold green]  ✓ {msg}[/]")
    else:
        cprint(f"  ✓ {msg}", Colors.GREEN, bold=True)


def print_error(msg: str) -> None:
    if HAS_RICH:
        console.print(f"[bold red]  ✗ {msg}[/]")
    else:
        cprint(f"  ✗ {msg}", Colors.RED, bold=True)


def print_warning(msg: str) -> None:
    if HAS_RICH:
        console.print(f"[bold yellow]  ⚠ {msg}[/]")
    else:
        cprint(f"  ⚠ {msg}", Colors.YELLOW, bold=True)


def print_info(msg: str) -> None:
    if HAS_RICH:
        console.print(f"[bold cyan]  ℹ {msg}[/]")
    else:
        cprint(f"  ℹ {msg}", Colors.CYAN, bold=True)


def print_section(title: str) -> None:
    """Print a section header with a separator line."""
    if HAS_RICH:
        console.print()
        console.rule(f"[bold bright_white]{title}[/]")
    else:
        print()
        cprint(f"  ─── {title} {'─' * (60 - len(title))}", Colors.WHITE, bold=True)
        print()


def print_kv(key: str, value: str, value_color: str = None) -> None:
    """Print a key-value pair."""
    if HAS_RICH:
        vc = value_color or "white"
        console.print(f"  [bold dim]{key}:[/] [{vc}]{value}[/]")
    else:
        cprint(f"  {key}:", Colors.GRAY, bold=False, end=" ")
        cprint(value, Colors.WHITE if not value_color else Colors.BRIGHT_CYAN)


def print_movie_card(movie: dict, index: int = 0) -> None:
    """Pretty-print a single movie entry."""
    vid = movie.get("vid", movie.get("id", "?"))
    title = movie.get("title", movie.get("video_title", "Unknown"))
    vj = movie.get("vj", movie.get("vjname", ""))
    category = movie.get("category", "")
    ldur = movie.get("ldur", "")
    paid = movie.get("paid", movie.get("paid_for", False))
    subscriber = movie.get("subscriber", False)
    image = movie.get("image", movie.get("thumbnail", ""))

    idx_str = f"[{index}]" if index > 0 else ""

    if HAS_RICH:
        paid_badge = "[yellow]💰 Paid[/]" if paid else "[green]Free[/]"
        sub_badge = "[cyan]⭐ Sub[/]" if subscriber else ""
        title_str = f"[bold bright_white]{idx_str} {title}[/]"
        meta = f"  [dim]VID: {vid}[/]"
        if vj:
            meta += f"  [dim]· VJ: {vj}[/]"
        if ldur:
            meta += f"  [dim]· {ldur}[/]"
        if category:
            meta += f"  [dim]· {category}[/]"
        console.print(f"  {title_str}  {paid_badge} {sub_badge}")
        console.print(f"  {meta}")
        console.print()
    else:
        paid_badge = "💰" if paid else "Free"
        sub_badge = "⭐" if subscriber else ""
        cprint(f"  {idx_str} {title}", Colors.BRIGHT_WHITE, bold=True)
        meta_parts = [f"VID:{vid}"]
        if vj:
            meta_parts.append(f"VJ:{vj}")
        if ldur:
            meta_parts.append(ldur)
        if category:
            meta_parts.append(category)
        cprint(f"    {'  ·  '.join(meta_parts)}  {paid_badge} {sub_badge}", Colors.GRAY)
        print()


def wrap_text(text: str, width: int = 80, indent: str = "    ") -> str:
    """Word-wrap text to a given width with indentation."""
    lines = textwrap.wrap(text, width=width - len(indent))
    return "\n".join(f"{indent}{line}" if line else "" for line in lines)


# ─── Interactive Prompt Helper ────────────────────────────────────────────────

def ask_input(prompt: str, default: str = None) -> str:
    """Prompt the user for input with an optional default value."""
    if HAS_RICH:
        if default:
            console.print(f"  [bold bright_cyan]{prompt}[/] [dim]({default})[/]", end=": ")
        else:
            console.print(f"  [bold bright_cyan]{prompt}[/]", end=": ")
    else:
        if default:
            cprint(f"  {prompt} ({default})", Colors.BRIGHT_CYAN, bold=True, end=": ")
        else:
            cprint(f"  {prompt}", Colors.BRIGHT_CYAN, bold=True, end=": ")

    try:
        answer = input().strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return ""

    if not answer and default:
        return default
    return answer


def ask_choice(prompt: str, options: list, allow_cancel: bool = True) -> int:
    """
    Ask the user to pick from a numbered list.
    Returns the 0-based index of the chosen option, or -1 if cancelled.
    """
    if HAS_RICH:
        console.print(f"\n  [bold bright_white]{prompt}[/]")
        if allow_cancel:
            console.print(f"  [dim]  (or type 0 to cancel)[/]")
    else:
        print(f"\n  {prompt}")
        if allow_cancel:
            cprint("  (or type 0 to cancel)", Colors.DIM)

    while True:
        answer = ask_input("  Your choice")
        if not answer:
            continue
        try:
            choice = int(answer)
            if allow_cancel and choice == 0:
                return -1
            if 1 <= choice <= len(options):
                return choice - 1
            else:
                print_warning(f"Please enter a number between 1 and {len(options)} (or 0 to cancel).")
        except ValueError:
            print_warning("Please enter a valid number.")


def ask_yes_no(prompt: str, default: bool = False) -> bool:
    """Ask a yes/no question. Returns True for yes, False for no."""
    hint = "Y/n" if default else "y/N"
    if HAS_RICH:
        console.print(f"  [bold bright_cyan]{prompt}[/] [dim]({hint})[/]")
    else:
        cprint(f"  {prompt} ({hint})", Colors.BRIGHT_CYAN, bold=True)

    answer = ask_input("", "y" if default else "n")
    return answer.lower().startswith("y")


# ─── HTTP Session ────────────────────────────────────────────────────────────

def create_session() -> requests.Session:
    """Create a requests session with retry logic."""
    session = requests.Session()
    session.headers.update(HEADERS)
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[408, 429, 502, 503, 504],
        allowed_methods=["GET", "POST"],
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


# ─── API Functions ───────────────────────────────────────────────────────────

def api_get(session: requests.Session, endpoint: str, timeout: int = 30, quiet: bool = False) -> Optional[dict]:
    """Make a GET request to the API and return JSON."""
    url = f"{BASE_URL}/{endpoint}"
    try:
        resp = session.get(url, timeout=timeout)
        resp.raise_for_status()

        # Detect HTML error pages from server (e.g. SQL errors, Slim app errors)
        content_type = resp.headers.get("content-type", "")
        if "text/html" in content_type:
            if not quiet:
                print_error(f"Server error at: {endpoint}")
                print_info("Tip: This endpoint has a server-side issue. Try dashboard or search instead.")
            return None

        data = resp.json()

        # Check for API-level error responses
        if isinstance(data, dict):
            if "400" in data and "token" in str(data["400"]).lower():
                if not quiet:
                    print_error(f"Authentication error: {endpoint}")
                    print_info("Tip: The API token may have expired for this endpoint.")
                return None
            if data.get("error") is True or data.get("exception"):
                msg = data.get("message", data.get("msg", data.get("exception", "Unknown server error")))
                if not quiet:
                    print_error(f"Server error: {msg}")
                    print_info("Tip: This is a server-side issue, not a problem with your tool.")
                return None

        return data
    except requests.exceptions.Timeout:
        if not quiet:
            print_error(f"Request timed out: {endpoint}")
            print_info("Tip: Check your internet connection and try again.")
        return None
    except requests.exceptions.ConnectionError:
        if not quiet:
            print_error(f"Connection error — check your internet connection.")
            print_info("Tip: Make sure you're online and the website https://munowatch.co is accessible.")
        return None
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code
        if status >= 500:
            if not quiet:
                print_error(f"Server error (HTTP {status}): {endpoint}")
                print_info("Tip: The Munowatch server has an issue with this endpoint. Try --dashboard or --search instead.")
            return None
        if not quiet:
            print_error(f"HTTP error {status}: {endpoint}")
            try:
                err_data = e.response.json()
                print_error(f"  API says: {err_data}")
            except Exception:
                print_error(f"  Response: {e.response.text[:200]}")
        return None
    except requests.exceptions.JSONDecodeError:
        if not quiet:
            print_error(f"Invalid JSON response from: {endpoint}")
            print_info("Tip: The API might be temporarily down. Try again in a few minutes.")
        return None
    except Exception as e:
        if not quiet:
            print_error(f"Unexpected error: {e}")
            print_info("Tip: If this persists, please report it to the developer.")
        return None


def api_post(session: requests.Session, endpoint: str, data: dict, timeout: int = 30) -> Optional[dict]:
    """Make a POST request to the API and return JSON."""
    url = f"{BASE_URL}/{endpoint}"
    try:
        resp = session.post(url, data=data, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print_error(f"POST request failed: {e}")
        return None


def get_dashboard(session: requests.Session) -> Optional[dict]:
    """Fetch the main dashboard."""
    return api_get(session, f"dashboard/v2/{USER_ID}")


def search_movies(session: requests.Session, query: str) -> Optional[dict]:
    """Search movies by query string."""
    encoded = urllib.parse.quote(query)
    return api_get(session, f"search/{encoded}/{USER_ID}/0")


def get_preview(session: requests.Session, vid: int, quiet: bool = False) -> Optional[dict]:
    """Get video preview/details including the playing URL."""
    resp = api_get(session, f"preview/v2/{vid}/{USER_ID}", quiet=quiet)
    if resp and "preview" in resp:
        return resp["preview"]
    return resp


def browse(session: requests.Session, browse_type: str) -> Optional[dict]:
    """Browse by type (e.g. 'tabs' or category name)."""
    return api_get(session, f"browse/{browse_type}")


def list_category(session: requests.Session, pipe: str, pid: str = "0") -> Optional[dict]:
    """List movies in a category."""
    return api_get(session, f"list/{pipe}/{pid}/{USER_ID}/0")


def list_shows(session: requests.Session, pipe: str, pid: str = "0") -> Optional[dict]:
    """List shows/series in a category."""
    return api_get(session, f"shows/{pipe}/{pid}/{USER_ID}/0")


def get_episodes(session: requests.Session, vid: int, scode: str, no: int) -> Optional[dict]:
    """Get episodes for a show."""
    return api_get(session, f"episodes/range/{vid}/{scode}/{no}")


def track_download(session: requests.Session, uid: str, vid: str, state: str = "1") -> None:
    """Report download to the API."""
    api_post(session, "download", {"uid": uid, "vid": vid, "state": state})


# ─── Extract movie list from various API response formats ────────────────────

def extract_movies(data) -> list:
    """Extract a list of movies from various API response formats."""
    movies = []
    if isinstance(data, list):
        movies = data
    elif isinstance(data, dict):
        for key in ("results", "movies", "data", "search", "items",
                     "dashboard", "episodes", "shows", "list", "tabs"):
            if key in data:
                val = data[key]
                if isinstance(val, list):
                    movies = val
                    break
        if not movies:
            movies = [data] if data.get("vid") or data.get("id") or data.get("title") else []
    return movies


# ─── Download helpers ────────────────────────────────────────────────────────

def check_aria2c() -> bool:
    """Check if aria2c is available on the system."""
    return shutil.which("aria2c") is not None


def sanitize_filename(name: str) -> str:
    """Sanitize a string to be used as a filename."""
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'\s+', ' ', name).strip()
    if not name:
        name = "munowatch_download"
    return name


def download_with_aria2c(url: str, output_path: str, vid: int, session: requests.Session) -> bool:
    """Download using aria2c for maximum speed (multi-connection)."""
    try:
        cmd = [
            "aria2c",
            "--summary-interval=5",
            "--file-allocation=none",
            "--continue=true",
            f"--max-connection-per-server=16",
            f"--split=16",
            "--min-split-size=1M",
            "--allow-overwrite=true",
            f"--dir={os.path.dirname(output_path)}",
            f"--out={os.path.basename(output_path)}",
            "--check-certificate=false",
            f"--header=X-Api-Key: {API_KEY}",
            f"--header=User-Agent: {USER_AGENT}",
            "--console-log-level=notice",
            url,
        ]

        if HAS_RICH:
            console.print(f"\n  [bold cyan]⬇ Downloading with aria2c (multi-connection)...[/]\n")
        else:
            cprint(f"\n  ⬇ Downloading with aria2c (multi-connection)...\n", Colors.CYAN, bold=True)

        result = subprocess.run(cmd)

        if result.returncode == 0:
            track_download(session, USER_ID, str(vid), "1")
            return True
        else:
            print_warning("aria2c failed, falling back to requests...")
            return False

    except FileNotFoundError:
        print_warning("aria2c not found, falling back to requests...")
        return False
    except Exception as e:
        print_warning(f"aria2c error: {e}, falling back to requests...")
        return False


def download_with_requests(url: str, output_path: str, vid: int, session: requests.Session) -> bool:
    """Download using requests with a progress bar."""
    temp_path = output_path + ".part"

    try:
        resp = session.get(url, stream=True, timeout=60)
        resp.raise_for_status()

        total_size = int(resp.headers.get("content-length", 0))

        if HAS_RICH:
            progress = Progress(
                TextColumn("[bold bright_cyan]⬇ Downloading"),
                BarColumn(bar_width=40),
                "[progress.percentage]{task.percentage:>3.1f}%",
                "•",
                DownloadColumn(),
                "•",
                TransferSpeedColumn(),
                "•",
                TimeElapsedColumn(),
                "/",
                RemainingTimeColumn(),
                console=console,
            )
            task_id = progress.add_task("download", total=total_size)
            progress.start()
        else:
            print()
            cprint(f"  ⬇ Downloading: {os.path.basename(output_path)}", Colors.CYAN, bold=True)

        downloaded = 0
        start_time = time.time()
        last_print = 0

        with open(temp_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)

                    if HAS_RICH:
                        progress.update(task_id, completed=downloaded)
                    else:
                        now = time.time()
                        if now - last_print >= 0.5 or downloaded == total_size:
                            last_print = now
                            elapsed = now - start_time
                            speed = downloaded / elapsed if elapsed > 0 else 0
                            if total_size > 0:
                                pct = (downloaded / total_size) * 100
                                done_mb = downloaded / (1024 * 1024)
                                total_mb = total_size / (1024 * 1024)
                                speed_str = f"{speed / (1024 * 1024):.1f} MB/s"
                                sys.stdout.write(
                                    f"\r  [{pct:5.1f}%] "
                                    f"{done_mb:.1f}/{total_mb:.1f} MB  "
                                    f"{speed_str}   "
                                )
                            else:
                                done_mb = downloaded / (1024 * 1024)
                                speed_str = f"{speed / (1024 * 1024):.1f} MB/s"
                                sys.stdout.write(
                                    f"\r  {done_mb:.1f} MB  {speed_str}   "
                                )
                            sys.stdout.flush()

        if not HAS_RICH:
            print()

        if HAS_RICH:
            progress.stop()

        # Rename temp file to final
        os.replace(temp_path, output_path)

        track_download(session, USER_ID, str(vid), "1")
        return True

    except KeyboardInterrupt:
        print_warning("\n  Download cancelled by user.")
        # Keep partial file
        if os.path.exists(temp_path):
            size = os.path.getsize(temp_path)
            if size > 0:
                cprint(f"  Partial download saved to: {temp_path}", Colors.YELLOW)
        return False
    except requests.exceptions.RequestException as e:
        print_error(f"Download failed: {e}")
        print_info("Tip: Check your internet connection and try again.")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False
    except Exception as e:
        print_error(f"Download error: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False


def download_movie(session: requests.Session, vid: int, output_dir: str = None,
                   force_aria2c: bool = False, force_requests: bool = False) -> bool:
    """
    Download a movie by VID.
    1. Fetch preview to get title and URL
    2. Download using aria2c or requests
    """
    print_info(f"Fetching preview for VID {vid}...")

    preview = get_preview(session, vid)
    if not preview:
        print_error(f"Could not get preview for VID {vid}")
        print_info("Tip: Make sure the video ID is correct. You can search for movies first.")
        return False

    playing_url = preview.get("playingUrl", "")
    if not playing_url:
        print_error("No download URL available for this video.")
        if preview.get("paid_for") and not preview.get("subscriber"):
            print_warning("This is a paid video. You may need a subscription to download it.")
            print_info(f"Visit {WEBSITE} to subscribe.")
        return False

    title = preview.get("video_title", preview.get("video_name", f"video_{vid}"))
    filename = sanitize_filename(preview.get("video_name", f"{title}.mp4"))
    if not filename.endswith(".mp4") and not filename.endswith(".mkv") and not filename.endswith(".avi"):
        filename += ".mp4"

    if output_dir is None:
        output_dir = DEFAULT_DOWNLOAD_DIR

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, filename)

    if HAS_RICH:
        console.print()
        console.print(Panel(
            f"[bold bright_white]{title}[/]\n"
            f"[dim]VID: {vid}[/]  ·  [dim]VJ: {preview.get('vjname', 'N/A')}[/]\n"
            f"[cyan]{filename}[/]\n"
            f"[dim]{playing_url}[/]",
            title="[bold bright_cyan]⬇ Starting Download[/]",
            border_style="cyan",
        ))
    else:
        print()
        cprint(f"  Title: {title}", Colors.BRIGHT_WHITE, bold=True)
        cprint(f"  VID:   {vid}  ·  VJ: {preview.get('vjname', 'N/A')}", Colors.GRAY)
        cprint(f"  File:  {filename}", Colors.CYAN)
        cprint(f"  URL:   {playing_url}", Colors.DIM)
        print()

    # Check for existing file
    if os.path.exists(output_path):
        file_size = os.path.getsize(output_path)
        if file_size > 0:
            print_warning(f"File already exists: {output_path} ({file_size / (1024*1024):.1f} MB)")
            if ask_yes_no("  Re-download anyway?", default=False):
                print_info("Re-downloading...")
            else:
                print_success("Skipped (file already downloaded).")
                return True

    use_aria2c = check_aria2c() and not force_requests

    if force_aria2c and not check_aria2c():
        print_warning("aria2c not found but --aria2c was specified, falling back to requests.")
        print_info("Tip: Install aria2c for faster downloads (sudo apt install aria2)")

    if use_aria2c:
        success = download_with_aria2c(playing_url, output_path, vid, session)
        if success:
            return True
        # Fallback to requests
        return download_with_requests(playing_url, output_path, vid, session)
    else:
        return download_with_requests(playing_url, output_path, vid, session)


# ─── Command Handlers ────────────────────────────────────────────────────────

def cmd_dashboard(session: requests.Session) -> int:
    """Show the full dashboard."""
    print_section("Loading Dashboard")
    data = get_dashboard(session)
    if not data:
        return 1

    # Print banner movie
    banner = data.get("banner")
    if banner and HAS_RICH:
        console.print(Panel(
            f"[bold bright_yellow]🎬 {banner.get('video_title', 'Featured')}[/]\n\n"
            f"[dim]{banner.get('description', '')}[/]\n\n"
            f"[cyan]VJ: {banner.get('vjname', '')}[/]  ·  "
            f"[dim]VID: {banner.get('id', '')}[/]",
            title="[bold]🌟 Featured[/]",
            border_style="yellow",
        ))
    elif banner:
        print()
        cprint("  ━━━ 🌟 FEATURED ━━━", Colors.BRIGHT_YELLOW, bold=True)
        cprint(f"  🎬 {banner.get('video_title', 'Featured')}", Colors.BRIGHT_WHITE, bold=True)
        cprint(f"  {banner.get('description', '')[:200]}", Colors.GRAY)
        cprint(f"  VJ: {banner.get('vjname', '')}  ·  VID: {banner.get('id', '')}", Colors.CYAN)
        print()

    # Print categories with movies
    dashboard = data.get("dashboard", [])
    if not dashboard:
        print_warning("Dashboard is empty.")
        print_info("Tip: The content might be loading. Try again in a moment.")
        return 0

    for i, cat in enumerate(dashboard):
        cat_id = cat.get("id", "?")
        cat_name = cat.get("category", f"Category {cat_id}")
        movies = cat.get("movies", [])

        if HAS_RICH:
            color_cycle = ["bright_cyan", "bright_green", "bright_magenta",
                           "bright_yellow", "bright_blue", "bright_red"]
            color = color_cycle[i % len(color_cycle)]
            console.print()
            console.print(
                f"[bold {color}]  ▸ {cat_name}[/] [dim](ID: {cat_id}, {len(movies)} movies)[/]"
            )
            console.print(f"  [dim]{'─' * 60}[/]")
        else:
            print()
            cprint(f"  ▸ {cat_name} (ID: {cat_id}, {len(movies)} movies)", Colors.BRIGHT_CYAN, bold=True)
            cprint(f"  {'─' * 60}", Colors.DIM)

        if not movies:
            cprint("    (empty)", Colors.DIM)
            continue

        for j, movie in enumerate(movies, 1):
            print_movie_card(movie, j)

    return 0


def cmd_search(session: requests.Session, query: str) -> int:
    """Search for movies."""
    print_section(f'Searching for "{query}"')
    data = search_movies(session, query)
    if not data:
        return 1

    movies = extract_movies(data)

    if not movies:
        print_warning(f'No results found for "{query}".')
        print_info("Tip: Try different keywords, check your spelling, or browse categories.")
        return 0

    print_success(f"Found {len(movies)} result(s)")
    print()

    for i, movie in enumerate(movies, 1):
        print_movie_card(movie, i)

    # Interactive selection hint
    if HAS_RICH:
        console.print(
            "\n  [dim]Tip: Type a number to preview/download, "
            "or use --preview VID / --download VID[/]"
        )
    else:
        cprint(
            "  Tip: Type a number to preview/download, or use --preview VID / --download VID",
            Colors.DIM,
        )

    return 0


def cmd_preview(session: requests.Session, vid: int) -> int:
    """Preview a video and show its details + download URL."""
    print_section(f"Preview: VID {vid}")
    data = get_preview(session, vid)
    if not data:
        return 1

    title = data.get("video_title", data.get("video_name", "Unknown"))
    playing_url = data.get("playingUrl", "")
    thumbnail = data.get("thumbnail", "")
    description = data.get("description", "")
    vjname = data.get("vjname", "")
    category_id = data.get("category_id", "")
    paid_for = data.get("paid_for", False)
    subscriber = data.get("subscriber", False)
    ldur = data.get("ldur", 0)
    httpcode = data.get("httpcode", "")
    video_name = data.get("video_name", "")

    if HAS_RICH:
        # Build info panel
        info_lines = []
        info_lines.append(f"[bold bright_white]{title}[/]")

        if vjname:
            info_lines.append(f"[cyan]VJ: {vjname}[/]")

        if category_id:
            cat_name = KNOWN_CATEGORIES.get(int(category_id), str(category_id))
            info_lines.append(f"[dim]Category: {cat_name} (ID: {category_id})[/]")

        status_parts = []
        if paid_for:
            status_parts.append("[yellow]💰 Paid[/]")
        else:
            status_parts.append("[green]Free[/]")
        if subscriber:
            status_parts.append("[cyan]⭐ Subscriber[/]")
        if httpcode:
            status_parts.append(f"[dim]HTTP {httpcode}[/]")
        info_lines.append("  ".join(status_parts))

        if ldur:
            info_lines.append(f"[dim]Duration: {ldur}[/]")

        console.print()
        console.print(Panel(
            "\n".join(info_lines),
            title="[bold bright_cyan]🎬 Video Preview[/]",
            border_style="cyan",
        ))

        if description:
            console.print()
            console.print(Panel(
                f"[dim]{description}[/]",
                title="[bold]📝 Description[/]",
                border_style="dim",
                padding=(1, 2),
            ))

        if video_name:
            console.print(f"\n  [bold]Filename:[/] [green]{video_name}[/]")

        if playing_url:
            console.print(f"\n  [bold]Download URL:[/] [cyan underline]{playing_url}[/]")
            console.print(f"\n  [dim]To download:[/] munowatch.py --download {vid}")
        else:
            console.print("\n  [bold red]No download URL available.[/]")
            if paid_for and not subscriber:
                console.print("[yellow]  This video requires a subscription.[/]")

        if thumbnail:
            console.print(f"\n  [bold]Thumbnail:[/] [dim]{thumbnail}[/]")

    else:
        print()
        cprint(f"  🎬 {title}", Colors.BRIGHT_WHITE, bold=True)
        if vjname:
            cprint(f"  VJ: {vjname}", Colors.CYAN)
        if category_id:
            cat_name = KNOWN_CATEGORIES.get(int(category_id), str(category_id))
            cprint(f"  Category: {cat_name} (ID: {category_id})", Colors.GRAY)

        status = "Paid" if paid_for else "Free"
        if subscriber:
            status += " · Subscriber"
        cprint(f"  Status: {status}", Colors.YELLOW if paid_for else Colors.GREEN)
        if httpcode:
            cprint(f"  HTTP Code: {httpcode}", Colors.GRAY)

        print()
        if description:
            print(wrap_text(description, 90))
            print()

        if video_name:
            cprint(f"  Filename: {video_name}", Colors.GREEN)
        if playing_url:
            cprint(f"  Download URL:", Colors.BRIGHT_WHITE, bold=True)
            cprint(f"  {playing_url}", Colors.BRIGHT_CYAN)
            cprint(f"  To download: munowatch.py --download {vid}", Colors.DIM)
        else:
            cprint("  No download URL available.", Colors.RED, bold=True)
            if paid_for and not subscriber:
                cprint("  This video requires a subscription.", Colors.YELLOW)

        if thumbnail:
            cprint(f"  Thumbnail: {thumbnail}", Colors.DIM)

    print()
    return 0


def cmd_categories(session: requests.Session) -> int:
    """List all known categories."""
    print_section("Available Categories")

    if HAS_RICH:
        table = Table(
            title="[bold bright_cyan]📂 Categories[/]",
            box=box.ROUNDED,
            border_style="cyan",
            show_lines=False,
            padding=(0, 2),
        )
        table.add_column("#", style="dim", justify="right", width=4)
        table.add_column("ID", style="bright_white", justify="right", width=6)
        table.add_column("Name", style="bright_green", min_width=30)
        table.add_column("Alias", style="dim", min_width=15)

        for idx, (cat_id, cat_name) in enumerate(sorted(KNOWN_CATEGORIES.items()), 1):
            alias = ""
            for a, cid in CATEGORY_ALIASES.items():
                if cid == cat_id:
                    alias = a
                    break
            table.add_row(str(idx), str(cat_id), cat_name, alias)

        console.print(table)

        console.print(
            "\n  [dim]Tip: Use --list PIPE PID  "
            "(use the alias or category name as PIPE)[/]"
        )
        console.print(f"  [dim]Example: munowatch.py --list action 0[/]")
    else:
        cprint(f"  {'#':>4}  {'ID':>4}  {'Name':<30}  {'Alias'}", Colors.BRIGHT_WHITE, bold=True)
        cprint(f"  {'─'*4}  {'─'*4}  {'─'*30}  {'─'*15}", Colors.DIM)
        for idx, (cat_id, cat_name) in enumerate(sorted(KNOWN_CATEGORIES.items()), 1):
            alias = ""
            for a, cid in CATEGORY_ALIASES.items():
                if cid == cat_id:
                    alias = a
                    break
            cprint(f"  {idx:>4}  {cat_id:>4}  {cat_name:<30}  {alias}", Colors.BRIGHT_CYAN)
        print()
        cprint("  Tip: Use --list PIPE PID (e.g., munowatch.py --list action 0)", Colors.DIM)

    return 0


def cmd_browse(session: requests.Session, browse_type: str) -> int:
    """Browse by type."""
    print_section(f"Browsing: {browse_type}")
    data = browse(session, browse_type)
    if not data:
        return 1

    if isinstance(data, dict):
        items = []
        for key in ("tabs", "data", "results", "movies", "categories", "items"):
            if key in data:
                val = data[key]
                if isinstance(val, list):
                    items = val
                    break

        if not items:
            if HAS_RICH:
                console.print_json(json.dumps(data, indent=2, default=str))
            else:
                print(json.dumps(data, indent=2, default=str))
        else:
            for i, item in enumerate(items, 1):
                if isinstance(item, dict):
                    name = item.get("name", item.get("category", item.get("title", str(item))))
                    item_id = item.get("id", "")
                    if HAS_RICH:
                        console.print(f"  [bold bright_cyan]{i}. {name}[/] [dim](ID: {item_id})[/]")
                    else:
                        cprint(f"  {i}. {name} (ID: {item_id})", Colors.BRIGHT_CYAN)
                else:
                    print(f"  {i}. {item}")
    elif isinstance(data, list):
        for i, item in enumerate(data, 1):
            if isinstance(item, dict):
                name = item.get("name", item.get("category", item.get("title", str(item))))
                item_id = item.get("id", "")
                if HAS_RICH:
                    console.print(f"  [bold bright_cyan]{i}. {name}[/] [dim](ID: {item_id})[/]")
                else:
                    cprint(f"  {i}. {name} (ID: {item_id})", Colors.BRIGHT_CYAN)
            else:
                print(f"  {i}. {item}")
    else:
        print(json.dumps(data, indent=2, default=str))

    return 0


def cmd_list(session: requests.Session, pipe: str, pid: str = "0") -> int:
    """List movies in a category."""
    # Resolve aliases
    if pipe in CATEGORY_ALIASES:
        resolved = CATEGORY_ALIASES[pipe]
        print_info(f"Resolved '{pipe}' → category ID {resolved}")
        pipe = str(resolved)

    print_section(f"List: pipe={pipe}, pid={pid}")
    data = list_category(session, pipe, pid)
    if not data:
        return 1

    movies = extract_movies(data)

    if not movies:
        print_warning("No movies found in this category.")
        print_info("Tip: Try a different category or check the PID (page number).")
        if HAS_RICH:
            console.print_json(json.dumps(data, indent=2, default=str)[:2000])
        return 0

    print_success(f"Found {len(movies)} movie(s)")
    print()

    for i, movie in enumerate(movies, 1):
        print_movie_card(movie, i)

    return 0


def cmd_shows(session: requests.Session, pipe: str, pid: str = "0") -> int:
    """List shows/series."""
    print_section(f"Shows: pipe={pipe}, pid={pid}")
    data = list_shows(session, pipe, pid)
    if not data:
        return 1

    shows = extract_movies(data)

    if not shows:
        print_warning("No shows found.")
        print_info("Tip: Try browsing categories with --browse tabs first.")
        if HAS_RICH:
            console.print_json(json.dumps(data, indent=2, default=str)[:2000])
        return 0

    print_success(f"Found {len(shows)} show(s)")
    print()

    for i, show in enumerate(shows, 1):
        print_movie_card(show, i)

    return 0


def cmd_episodes(session: requests.Session, vid: int, scode: str, no: int) -> int:
    """Get episodes for a show."""
    print_section(f"Episodes: VID={vid}, SCODE={scode}, NO={no}")
    data = get_episodes(session, vid, scode, no)
    if not data:
        return 1

    episodes = extract_movies(data)

    if not episodes:
        print_warning("No episodes found.")
        print_info("Tip: Check the VID, season code, and episode number are correct.")
        if HAS_RICH:
            console.print_json(json.dumps(data, indent=2, default=str)[:2000])
        return 0

    print_success(f"Found {len(episodes)} episode(s)")
    print()

    for i, ep in enumerate(episodes, 1):
        print_movie_card(ep, i)

    return 0


# ─── Series / Shows Download Helpers ──────────────────────────────────────────

def get_series_episode_list(session: requests.Session, vid: int) -> Optional[list]:
    """
    Get the full list of episodes for a series given any episode VID.
    Returns a list of dicts with keys: vid, title, video_name, playingUrl.
    Returns None if the VID is not part of a series.
    """
    preview = get_preview(session, vid)
    if not preview:
        return None

    series_code = preview.get("series_code", "")
    if not series_code:
        return None  # Not a series

    total_episodes = int(preview.get("episodes", 0))
    if total_episodes <= 0:
        return None

    series_title = preview.get("video_title", f"Series {vid}")

    # Get episode range pages
    range_data = get_episodes(session, vid, series_code, total_episodes)
    if not range_data or not isinstance(range_data, list):
        return None

    all_episodes = []

    for page in range_data:
        eps_range_str = page.get("eps_range", "")
        eps_label = page.get("eps", "")

        if "__" not in eps_range_str:
            continue

        start_vid, end_vid = eps_range_str.split("__")
        start_vid = int(start_vid)
        end_vid = int(end_vid)

        # Scan all VIDs in the range and filter by series_code
        # (the range may contain non-series movies in between)
        for check_vid in range(start_vid, end_vid + 1):
            try:
                ep_preview = get_preview(session, check_vid, quiet=True)
            except Exception:
                continue

            if not ep_preview:
                continue

            # Only include VIDs that belong to this series
            if str(ep_preview.get("series_code", "")) != str(series_code):
                continue

            playing_url = ep_preview.get("playingUrl", "")
            if not playing_url:
                continue

            all_episodes.append({
                "vid": check_vid,
                "title": ep_preview.get("video_title", ""),
                "video_name": ep_preview.get("video_name", ""),
                "playingUrl": playing_url,
                "size": ep_preview.get("size", ""),
            })

    return all_episodes


def print_series_info(session: requests.Session, vid: int) -> Optional[dict]:
    """Print series info and return the episode list, or None if not a series."""
    preview = get_preview(session, vid)
    if not preview:
        print_error(f"Could not get preview for VID {vid}")
        return None

    series_code = preview.get("series_code", "")
    if not series_code:
        print_warning("This video is not part of a series.")
        return None

    total = int(preview.get("episodes", 0))
    title = preview.get("video_title", f"Series {vid}")
    genre = preview.get("genre", "")
    vj = preview.get("vjname", "")

    if HAS_RICH:
        info_lines = [
            f"[bold bright_white]{title}[/]",
        ]
        if genre:
            info_lines.append(f"[dim]Genre: {genre}[/]")
        info_lines.append(f"[dim]Series Code: {series_code}[/]")
        info_lines.append(f"[bright_cyan]Total Episodes: {total}[/]")
        if vj:
            info_lines.append(f"[dim]VJ: {vj}[/]")
        console.print()
        console.print(Panel(
            "\n".join(info_lines),
            title="[bold bright_yellow]📺 Series Info[/]",
            border_style="yellow",
        ))
    else:
        print()
        cprint(f"  📺 {title}", Colors.BRIGHT_WHITE, bold=True)
        if genre:
            cprint(f"  Genre: {genre}", Colors.GRAY)
        cprint(f"  Series Code: {series_code}", Colors.GRAY)
        cprint(f"  Total Episodes: {total}", Colors.BRIGHT_CYAN, bold=True)
        if vj:
            cprint(f"  VJ: {vj}", Colors.GRAY)
        print()

    # Fetch episode list
    print_info("Fetching episode list...")
    episodes = get_series_episode_list(session, vid)
    if not episodes:
        print_error("Could not fetch episode list.")
        return None

    # Display episodes
    print_success(f"Found {len(episodes)} episode(s)")
    print()
    for i, ep in enumerate(episodes, 1):
        ep_title = ep.get("title", f"Episode {i}")
        ep_file = ep.get("video_name", "")
        ep_size = ep.get("size", "")

        if HAS_RICH:
            meta = f"  [dim]VID: {ep['vid']}[/]"
            if ep_size:
                meta += f"  [dim]· {ep_size}[/]"
            console.print(f"  [bold]{i:>3}.[/] [bright_white]{ep_title}[/]{meta}")
            if ep_file:
                console.print(f"       [dim]{ep_file}[/]")
        else:
            meta = f"VID:{ep['vid']}"
            if ep_size:
                meta += f" · {ep_size}"
            cprint(f"  {i:>3}. {ep_title}", Colors.BRIGHT_WHITE, bold=True)
            cprint(f"       {meta}  |  {ep_file}", Colors.DIM)
        print()

    return {"preview": preview, "episodes": episodes}


def download_series(session: requests.Session, vid: int, output_dir: str = None,
                    episode_range: tuple = None, force_aria2c: bool = False,
                    force_requests: bool = False) -> int:
    """
    Download episodes of a series.
    episode_range: (start, end) 1-based episode numbers to download, e.g. (1, 5).
                   None means download all episodes.
    """
    print_section(f"Series Download: VID {vid}")

    info = print_series_info(session, vid)
    if not info:
        return 1

    episodes = info["episodes"]
    preview = info["preview"]
    series_title = preview.get("video_title", f"Series {vid}")

    # Apply episode range filter
    if episode_range:
        start_ep, end_ep = episode_range
        filtered = []
        for i, ep in enumerate(episodes, 1):
            if start_ep <= i <= end_ep:
                filtered.append(ep)
        episodes = filtered
        if not episodes:
            print_warning(f"No episodes in range {start_ep}-{end_ep}.")
            return 1
        print_info(f"Downloading episodes {start_ep} to {end_ep} ({len(episodes)} episodes)")

    # Create a series subfolder
    if output_dir is None:
        output_dir = DEFAULT_DOWNLOAD_DIR

    safe_title = sanitize_filename(series_title)
    series_dir = os.path.join(output_dir, safe_title)
    os.makedirs(series_dir, exist_ok=True)

    if HAS_RICH:
        console.print(Panel(
            f"[bold]{series_title}[/]\n"
            f"[dim]{len(episodes)} episode(s) → {series_dir}[/]",
            title="[bold bright_cyan]⬇ Series Download[/]",
            border_style="cyan",
        ))
    else:
        cprint(f"  ⬇ Downloading {series_title}", Colors.BRIGHT_CYAN, bold=True)
        cprint(f"    {len(episodes)} episodes → {series_dir}", Colors.DIM)

    successes = 0
    failures = 0
    skipped = 0

    for i, ep in enumerate(episodes, 1):
        ep_vid = ep["vid"]
        ep_title = ep.get("title", f"Episode {i}")
        ep_num_label = f"[{i}/{len(episodes)}]"

        # Check if already downloaded
        filename = sanitize_filename(ep.get("video_name", f"{ep_title}.mp4"))
        if not filename.endswith(".mp4") and not filename.endswith(".mkv") and not filename.endswith(".avi"):
            filename += ".mp4"
        file_path = os.path.join(series_dir, filename)

        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
            print_info(f"{ep_num_label} {ep_title} — already downloaded, skipping.")
            skipped += 1
            successes += 1
            continue

        if HAS_RICH:
            console.print(f"\n  [bold bright_cyan]{ep_num_label} {ep_title}[/] [dim](VID {ep_vid})[/]")
        else:
            cprint(f"\n  {ep_num_label} {ep_title} (VID {ep_vid})", Colors.BRIGHT_CYAN, bold=True)

        ok = download_movie(session, ep_vid, output_dir=series_dir,
                            force_aria2c=force_aria2c, force_requests=force_requests)
        if ok:
            successes += 1
        else:
            failures += 1

    # Summary
    print_section("Series Download Summary")
    print_success(f"Downloaded: {successes}/{len(episodes)}")
    if skipped > 0:
        print_info(f"Skipped (already exists): {skipped}")
    if failures > 0:
        print_error(f"Failed: {failures}/{len(episodes)}")

    if HAS_RICH:
        console.print(f"\n  [dim]Saved to: {series_dir}[/]\n")
    else:
        cprint(f"\n  Saved to: {series_dir}\n", Colors.DIM)

    return 0 if failures == 0 else 1


def cmd_download(session: requests.Session, vids: list, output_dir: str = None,
                 force_aria2c: bool = False, force_requests: bool = False) -> int:
    """Download one or more movies."""
    if not vids:
        print_error("No video IDs specified.")
        print_info("Tip: Use --search to find movies, then provide the VID to download.")
        return 1

    if len(vids) > 1:
        print_section(f"Batch Download: {len(vids)} videos")

    successes = 0
    failures = 0

    for i, vid in enumerate(vids):
        if len(vids) > 1:
            print_info(f"[{i+1}/{len(vids)}] Processing VID {vid}...")
            print()

        ok = download_movie(session, vid, output_dir, force_aria2c, force_requests)
        if ok:
            successes += 1
            print_success(f"Download complete: VID {vid}")
        else:
            failures += 1
            print_error(f"Download failed: VID {vid}")

        if i < len(vids) - 1:
            print()

    # Summary
    if len(vids) > 1:
        print_section("Download Summary")
        print_success(f"Completed: {successes}/{len(vids)}")
        if failures > 0:
            print_error(f"Failed: {failures}/{len(vids)}")

    return 0 if failures == 0 else 1


# ─── Interactive Mode ────────────────────────────────────────────────────────

def interactive_menu(session: requests.Session) -> int:
    """Run the interactive menu mode — the easiest way to use Munowatch CLI."""

    while True:
        print()
        if HAS_RICH:
            console.print(Panel(
                "[bold bright_white]What would you like to do?[/]\n\n"
                "  [bold bright_cyan]1[/]  🔍  Search for a movie\n"
                "  [bold bright_cyan]2[/]  🏠  View Dashboard (trending & categories)\n"
                "  [bold bright_cyan]3[/]  📂  Browse Categories\n"
                "  [bold bright_cyan]4[/]  🔎  Preview a video (by VID)\n"
                "  [bold bright_cyan]5[/]  ⬇️  Download a video (by VID)\n"
                "  [bold bright_cyan]6[/]  📺  Download a Series (all episodes)\n"
                "  [bold bright_cyan]7[/]  ℹ️   About this tool\n"
                "  [bold bright_cyan]0[/]  🚪  Exit",
                title="[bold bright_yellow]🎬 Munowatch CLI — Interactive Menu[/]",
                border_style="yellow",
                padding=(1, 2),
            ))
        else:
            cprint("  ═══ 🎬 Munowatch CLI — Interactive Menu ═══", Colors.BRIGHT_YELLOW, bold=True)
            print()
            cprint("  1  🔍  Search for a movie", Colors.BRIGHT_CYAN)
            cprint("  2  🏠  View Dashboard (trending & categories)", Colors.BRIGHT_CYAN)
            cprint("  3  📂  Browse Categories", Colors.BRIGHT_CYAN)
            cprint("  4  🔎  Preview a video (by VID)", Colors.BRIGHT_CYAN)
            cprint("  5  ⬇️  Download a video (by VID)", Colors.BRIGHT_CYAN)
            cprint("  6  📺  Download a Series (all episodes)", Colors.BRIGHT_CYAN)
            cprint("  7  ℹ️   About this tool", Colors.BRIGHT_CYAN)
            cprint("  0  🚪  Exit", Colors.BRIGHT_CYAN)
            print()

        choice = ask_input("Enter choice", "")

        if choice == "0" or choice.lower() in ("exit", "quit", "q"):
            if HAS_RICH:
                console.print("\n  [bold green]Thanks for using Munowatch CLI! Goodbye! 👋[/]\n")
            else:
                cprint("\n  Thanks for using Munowatch CLI! Goodbye! 👋\n", Colors.BRIGHT_GREEN)
            return 0

        elif choice == "1":
            query = ask_input("Enter movie name to search", "")
            if not query:
                print_warning("Please enter a movie name.")
                continue

            print_section(f'Searching for "{query}"')
            data = search_movies(session, query)
            if not data:
                continue

            movies = extract_movies(data)

            if not movies:
                print_warning(f'No results found for "{query}".')
                print_info("Tip: Try different keywords or check your spelling.")
                continue

            print_success(f"Found {len(movies)} result(s)")
            print()

            for i, movie in enumerate(movies, 1):
                print_movie_card(movie, i)

            # Ask what to do
            idx = ask_choice("What would you like to do?", [
                "Preview a result",
                "Download a result",
                "Search again",
                "Back to menu",
            ])

            if idx == -1:
                continue
            elif idx == 0:
                # Preview
                sel = ask_choice("Select a result to preview", movies)
                if sel >= 0:
                    vid = int(movies[sel].get("vid", movies[sel].get("id", 0)))
                    cmd_preview(session, vid)
                    # Offer to download after preview
                    if ask_yes_no("Download this video?", default=True):
                        download_movie(session, vid)
            elif idx == 1:
                # Download
                sel = ask_choice("Select a result to download", movies)
                if sel >= 0:
                    vid = int(movies[sel].get("vid", movies[sel].get("id", 0)))
                    download_movie(session, vid)
            elif idx == 2:
                continue  # search again
            elif idx == 3:
                continue  # back to menu

        elif choice == "2":
            cmd_dashboard(session)

        elif choice == "3":
            cmd_categories(session)

            pipe = ask_input("Enter category name or alias (e.g. 'action', 'horror')", "")
            if not pipe:
                continue

            pid = ask_input("Enter page number", "0")
            cmd_list(session, pipe, pid)

        elif choice == "4":
            vid_str = ask_input("Enter Video ID (VID)", "")
            if not vid_str:
                print_warning("Please enter a video ID.")
                continue
            try:
                vid = int(vid_str)
                cmd_preview(session, vid)
                if ask_yes_no("Download this video?", default=True):
                    download_movie(session, vid)
            except ValueError:
                print_error("VID must be a number.")

        elif choice == "5":
            vid_str = ask_input("Enter Video ID (VID)", "")
            if not vid_str:
                print_warning("Please enter a video ID.")
                continue
            try:
                vid = int(vid_str)
                download_movie(session, vid)
            except ValueError:
                print_error("VID must be a number.")

        elif choice == "6":
            # Series download
            vid_str = ask_input("Enter any episode VID from the series", "")
            if not vid_str:
                print_warning("Please enter a video ID (any episode from the series).")
                continue
            try:
                vid = int(vid_str)
            except ValueError:
                print_error("VID must be a number.")
                continue

            # First show series info
            info = print_series_info(session, vid)
            if not info:
                continue

            episodes = info["episodes"]
            total = len(episodes)

            # Ask download scope
            scope_choice = ask_choice("Download scope?", [
                f"All episodes (1-{total})",
                "Custom range (e.g. episodes 1-5)",
                "Back to menu",
            ])

            if scope_choice == -1:
                continue
            elif scope_choice == 0:
                # Download all
                download_series(session, vid)
            elif scope_choice == 1:
                # Custom range
                start_str = ask_input("Start episode number", "1")
                end_str = ask_input("End episode number", str(total))
                try:
                    start_ep = int(start_str)
                    end_ep = int(end_str)
                    if start_ep < 1 or end_ep > total or start_ep > end_ep:
                        print_warning(f"Invalid range. Must be between 1 and {total}.")
                        continue
                    download_series(session, vid, episode_range=(start_ep, end_ep))
                except ValueError:
                    print_error("Episode numbers must be integers.")
            elif scope_choice == 2:
                continue

        elif choice == "7":
            print_section("About Munowatch CLI")
            if HAS_RICH:
                console.print(Panel(
                    f"[bold bright_white]Munowatch CLI[/] [dim]v{VERSION}[/]\n\n"
                    f"[bold]Developer:[/] [bright_cyan]{DEVELOPER}[/]\n"
                    f"[bold]Website:[/]   [cyan]{WEBSITE}[/]\n\n"
                    f"[dim]A feature-rich, user-friendly CLI tool for searching,[/]\n"
                    f"[dim]browsing, previewing, and downloading movies from Munowatch.[/]\n\n"
                    f"[dim]Requirements:[/] requests\n"
                    f"[dim]Optional:[/]      rich (for beautiful colors), aria2c (for fast downloads)\n\n"
                    f"[bright_green]Thank you for using Munowatch CLI! 💚[/]",
                    title="[bold bright_yellow]ℹ️ About[/]",
                    border_style="yellow",
                    padding=(1, 2),
                ))
            else:
                cprint(f"  Munowatch CLI v{VERSION}", Colors.BRIGHT_WHITE, bold=True)
                print()
                cprint(f"  Developer: {DEVELOPER}", Colors.BRIGHT_CYAN, bold=True)
                cprint(f"  Website:   {WEBSITE}", Colors.CYAN)
                print()
                cprint("  A feature-rich, user-friendly CLI tool for searching,", Colors.DIM)
                cprint("  browsing, previewing, and downloading movies from Munowatch.", Colors.DIM)
                print()
                cprint("  Requirements: requests", Colors.DIM)
                cprint("  Optional: rich (colors), aria2c (fast downloads)", Colors.DIM)
                print()
                cprint("  Thank you for using Munowatch CLI! 💚", Colors.BRIGHT_GREEN)

        else:
            print_warning(f"Unknown choice: '{choice}'. Please enter 0-7.")


def show_welcome() -> None:
    """Show a friendly welcome message for first-time / no-arg users."""
    print()
    if HAS_RICH:
        console.print(Panel(
            "[bold bright_white]Welcome to Munowatch CLI! 🎬[/]\n\n"
            "[dim]This tool lets you search, browse, preview, and download movies.[/]\n\n"
            "[bold bright_cyan]Getting started is easy:[/]\n"
            "  • Just run the tool with no arguments for an [bold]interactive menu[/]\n"
            "  • Or use flags like [bold]--search[/], [bold]--dashboard[/], [bold]--download[/]\n"
            "  • Type [bold]--help[/] to see all available commands\n\n"
            f"[dim]Developed with ♥ by {DEVELOPER}[/]",
            title="[bold]👋 Welcome[/]",
            border_style="green",
            padding=(1, 2),
        ))
    else:
        cprint("  ═══ 👋 Welcome to Munowatch CLI! ═══", Colors.BRIGHT_GREEN, bold=True)
        print()
        cprint("  This tool lets you search, browse, preview, and download movies.", Colors.DIM)
        print()
        cprint("  Getting started is easy:", Colors.BRIGHT_CYAN, bold=True)
        cprint("  • Run with no arguments for an interactive menu", Colors.WHITE)
        cprint("  • Use flags like --search, --dashboard, --download", Colors.WHITE)
        cprint("  • Type --help to see all commands", Colors.WHITE)
        print()
        cprint(f"  Developed with ♥ by {DEVELOPER}", Colors.DIM)
        print()


# ─── Argument Parser ─────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""
    parser = argparse.ArgumentParser(
        prog="munowatch",
        description=(
            f"Munowatch CLI v{VERSION} — Search, browse, preview, and download movies.\n"
            f"Developed by {DEVELOPER} | {WEBSITE}\n\n"
            "Just run with no arguments for an easy interactive menu!"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(f"""\
            examples:
              munowatch.py                     # Interactive menu (easiest!)
              munowatch.py --search "Avengers" # Search & pick from results
              munowatch.py --dashboard         # See what's trending
              munowatch.py --download 63003    # Download by VID
              munowatch.py --download 63003 63004 63005  # Batch download
              munowatch.py --series 17976      # Download full series (all episodes)
              munowatch.py --series 17976 --eps 1 5  # Download episodes 1-5 only
              munowatch.py --series-info 17976  # View series episode list without downloading
              munowatch.py --categories        # Browse all categories
              munowatch.py --list action 0     # List action movies

            download options:
              --output-dir DIR    Save downloads to DIR (default: ~/Downloads/Munowatch)
              --aria2c            Force use aria2c for faster downloads
              --no-aria2c         Use requests only (no aria2c)

            developer: {DEVELOPER}
            website:   {WEBSITE}
        """),
    )

    parser.add_argument(
        "--version", "-V",
        action="version",
        version=f"Munowatch CLI v{VERSION}\nDeveloped by {DEVELOPER}\n{WEBSITE}",
    )

    # Commands
    parser.add_argument(
        "--dashboard", "-d",
        action="store_true",
        help="Show the main dashboard with all categories and movies",
    )

    parser.add_argument(
        "--search", "-s",
        metavar="QUERY",
        type=str,
        help='Search for movies (e.g. --search "Avengers")',
    )

    parser.add_argument(
        "--preview", "-p",
        metavar="VID",
        type=int,
        help="Get details and download URL for a video ID",
    )

    parser.add_argument(
        "--download", "-dl",
        metavar="VID",
        type=int,
        nargs="+",
        help="Download one or more movies by video ID(s)",
    )

    parser.add_argument(
        "--batch",
        metavar="VIDS",
        type=int,
        nargs="+",
        help="Batch download multiple videos by IDs (alias for --download)",
    )

    parser.add_argument(
        "--series",
        metavar="VID",
        type=int,
        help="Download all episodes of a series (provide any episode VID)",
    )

    parser.add_argument(
        "--series-info",
        metavar="VID",
        type=int,
        help="View series info and episode list without downloading",
    )

    parser.add_argument(
        "--eps",
        metavar=("START", "END"),
        type=int,
        nargs=2,
        default=None,
        help="Episode range to download with --series (e.g. --eps 1 5 for episodes 1-5)",
    )

    parser.add_argument(
        "--browse", "-b",
        metavar="TYPE",
        type=str,
        help="Browse by type (e.g., 'tabs' or a category name)",
    )

    parser.add_argument(
        "--categories", "-c",
        action="store_true",
        help="List all available categories (action, horror, drama, etc.)",
    )

    parser.add_argument(
        "--list", "-l",
        metavar=("PIPE", "PID"),
        type=str,
        nargs=2,
        help="List movies in a category (e.g. --list action 0)",
    )

    parser.add_argument(
        "--shows",
        metavar=("PIPE", "PID"),
        type=str,
        nargs=2,
        help="List shows/series in a category",
    )

    parser.add_argument(
        "--episodes",
        metavar=("VID", "SCODE", "NO"),
        type=str,
        nargs=3,
        help="Get episodes for a show (VID, season code, episode number)",
    )

    # Download options
    parser.add_argument(
        "--output-dir", "-o",
        metavar="DIR",
        type=str,
        default=None,
        help=f"Output directory for downloads (default: {DEFAULT_DOWNLOAD_DIR})",
    )

    parser.add_argument(
        "--aria2c",
        action="store_true",
        default=False,
        help="Force use aria2c for downloads (faster, multi-connection)",
    )

    parser.add_argument(
        "--no-aria2c",
        action="store_true",
        default=False,
        help="Disable aria2c, always use requests for downloads",
    )

    return parser


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> int:
    """Main entry point."""
    parser = build_parser()
    args = parser.parse_args()

    # ─── No arguments → Interactive Mode ──────────────────────────────────
    if not sys.argv[1:]:
        print_banner()
        show_welcome()
        session = create_session()
        try:
            return interactive_menu(session)
        except KeyboardInterrupt:
            print()
            if HAS_RICH:
                console.print("\n  [bold yellow]Interrupted. Goodbye! 👋[/]\n")
            else:
                cprint("\n  Interrupted. Goodbye! 👋\n", Colors.BRIGHT_YELLOW)
            return 130

    # ─── Banner for all CLI modes ────────────────────────────────────────
    print_banner()

    # Resolve download VIDs
    download_vids = []
    if args.download:
        download_vids.extend(args.download)
    if args.batch:
        download_vids.extend(args.batch)

    # Create session
    session = create_session()

    try:
        # Dashboard
        if args.dashboard:
            return cmd_dashboard(session)

        # Search
        if args.search:
            return cmd_search(session, args.search)

        # Preview
        if args.preview is not None:
            return cmd_preview(session, args.preview)

        # Download
        if download_vids:
            return cmd_download(
                session, download_vids,
                output_dir=args.output_dir,
                force_aria2c=args.aria2c,
                force_requests=args.no_aria2c,
            )

        # Series Info
        if args.series_info is not None:
            info = print_series_info(session, args.series_info)
            return 0 if info else 1

        # Series Download
        if args.series is not None:
            ep_range = None
            if args.eps:
                ep_range = tuple(args.eps)
            return download_series(
                session, args.series,
                output_dir=args.output_dir,
                episode_range=ep_range,
                force_aria2c=args.aria2c,
                force_requests=args.no_aria2c,
            )

        # Browse
        if args.browse:
            return cmd_browse(session, args.browse)

        # Categories
        if args.categories:
            return cmd_categories(session)

        # List
        if args.list:
            pipe, pid = args.list
            return cmd_list(session, pipe, pid)

        # Shows
        if args.shows:
            pipe, pid = args.shows
            return cmd_shows(session, pipe, pid)

        # Episodes
        if args.episodes:
            vid_str, scode, no_str = args.episodes
            try:
                vid = int(vid_str)
                no = int(no_str)
            except ValueError:
                print_error("VID and NO must be integers.")
                print_info("Tip: Check the values and try again.")
                return 1
            return cmd_episodes(session, vid, scode, no)

    except KeyboardInterrupt:
        print_warning("\n  Interrupted by user.")
        return 130
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        print_info(f"Tip: If this persists, please report it to {DEVELOPER}.")
        if os.environ.get("MUNOWATCH_DEBUG"):
            import traceback
            traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
