"""Хуки сборки документации. Подключены в mkdocs.yml ключом hooks."""


def on_post_page(output: str, **_kwargs) -> str:
    """Ставит lang="ru" на страницах.

    Тема shadcn зашивает lang="en" прямо в свой шаблон main.html. Весь текст
    документации русский, поэтому правим атрибут на выходе: это дешевле, чем
    форкать шаблон темы целиком через custom_dir и потом тянуть его правки.
    """
    return output.replace('<html lang="en"', '<html lang="ru"', 1)
