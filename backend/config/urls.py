from django.contrib import admin
from django.urls import path

from accounts import views as accounts
from directory import views as directory

api = [
    path("directory", directory.directory),
    path("organizations/<slug:slug>", directory.organization_profile),
    path("organizations/<slug:slug>/990", directory.form990_pdf),
    path("listings/<slug:slug>", directory.organization_listing),
    path("listings/<slug:slug>/claim", directory.claim),
    path("subscriptions", directory.subscribe),
    path("apply", directory.apply),
    path("me", accounts.me),
    path("me/organizations/<slug:slug>/profile", directory.managed_profile),
    path("auth/link", accounts.request_link),
    path("auth/callback", accounts.callback),
    path("auth/signout", accounts.sign_out),
]

urlpatterns = [
    path("admin/990/<uuid:org_id>", directory.admin_form990_pdf, name="admin-990"),
    path("admin/", admin.site.urls),
    *[path(f"api/{p.pattern}", p.callback) for p in api],
]
