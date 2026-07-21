def test_require_admin_dependency_imports():
    from dependencies import require_admin

    assert callable(require_admin)
