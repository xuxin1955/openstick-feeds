include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-modeminfo
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPLv3

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=Applications
  TITLE:=Information dashboard for 3G/LTE dongle
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/etc
	cp -r ./root/etc $(1)/

	$(INSTALL_DIR) $(1)/usr
	cp -r ./root/usr/* $(1)/usr/

	$(INSTALL_DIR) $(1)/www
	cp -r ./htdocs/* $(1)/www/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
	if [ -f ./po/zh_Hans/modeminfo.po ]; then \
		$(INSTALL_DATA) ./po/zh_Hans/modeminfo.po \
			$(1)/usr/lib/lua/luci/i18n/modeminfo.zh_Hans.po; \
	fi
endef
