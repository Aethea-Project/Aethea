# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from functools import lru_cache


@lru_cache(maxsize=1)
def load_environment():
    """Load environment variables from a local .env file if python-dotenv is installed.

    Safe to call multiple times; it will only load once.
    """
    try:

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

        from dotenv import load_dotenv, find_dotenv
    except ImportError:
        return False

    dotenv_path = find_dotenv(usecwd=True)
    if dotenv_path:
        return load_dotenv(dotenv_path, override=False)

    return load_dotenv(override=False)


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]