include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI interface for SMS SQLite Sync
LUCI_DEPENDS:=+sqlite3-cli +sms-sqlite-sync
LUCI_PKGARCH:=all
PKG_LICENSE:=GPL-2.0

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-sms-sqlite/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] || /etc/init.d/rpcd restart >/dev/null 2>&1 || true
exit 0
endef

# call BuildPackage
