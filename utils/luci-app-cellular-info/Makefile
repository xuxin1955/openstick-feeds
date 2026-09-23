include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Cellular Information
LUCI_DEPENDS:=+qmi-utils +modem-at-engine +jsonfilter
LUCI_PKGARCH:=all
PKG_LICENSE:=GPL-3.0

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-cellular-info/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] || /etc/init.d/rpcd restart >/dev/null 2>&1 || true
exit 0
endef

# call BuildPackage
