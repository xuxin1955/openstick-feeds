include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-cellular-info
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-cellular-info
  SECTION:=net
  CATEGORY:=Network
  TITLE:=LuCI Cellular Information
  DEPENDS:=+qmi-utils +modem-at-engine +jsonfilter +luci-base
  PKGARCH:=all
endef

define Package/luci-app-cellular-info/description
  LuCI Cellular Information
endef

define Build/Compile
endef

define Package/luci-app-cellular-info/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-cellular-info.json $(1)/usr/share/luci/menu.d/
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-cellular-info.json $(1)/usr/share/rpcd/acl.d/
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/cellular_info
	$(CP) ./htdocs/luci-static/resources/view/cellular_info/index.js $(1)/www/luci-static/resources/view/cellular_info/
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/cellular_info $(1)/usr/libexec/rpcd/cellular_info
endef

define Package/luci-app-cellular-info/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] || /etc/init.d/rpcd restart >/dev/null 2>&1 || true
exit 0
endef

$(eval $(call BuildPackage,luci-app-cellular-info))
