import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        return self.create_user(email, password, is_staff=True, is_superuser=True, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """A person: nonprofit staff (sign in by emailed link) or FindCauses admins (email and password)."""

    email = models.EmailField(unique=True)
    is_staff = models.BooleanField(default=False, help_text="Can sign in to this admin.")
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"

    def __str__(self):
        return self.email


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class SignInLink(models.Model):
    """A one-time emailed sign-in link. Only a hash of the token is stored."""

    LIFETIME = timedelta(minutes=30)

    token_hash = models.CharField(max_length=64, unique=True)
    email = models.EmailField()
    next = models.CharField(max_length=500, default="/dashboard", help_text="Where to go after signing in.")
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["email", "created_at"])]

    @classmethod
    def issue(cls, email: str, next: str) -> str:
        """Creates a link and returns the raw token to email."""
        token = secrets.token_urlsafe(32)
        cls.objects.create(token_hash=_hash(token), email=email.lower(), next=next)
        return token

    @classmethod
    def revoke(cls, token: str) -> None:
        """Removes a link whose email never went out, so it doesn't count against the one-a-minute limit."""
        cls.objects.filter(token_hash=_hash(token)).delete()

    @classmethod
    def redeem(cls, token: str):
        """Uses up a valid link (once) and returns it, or None."""
        fresh = timezone.now() - cls.LIFETIME
        link = cls.objects.filter(token_hash=_hash(token), used_at__isnull=True, created_at__gte=fresh).first()
        if not link:
            return None
        # Mark it used atomically so a link can't be redeemed twice in a race.
        if not cls.objects.filter(pk=link.pk, used_at__isnull=True).update(used_at=timezone.now()):
            return None
        return link
