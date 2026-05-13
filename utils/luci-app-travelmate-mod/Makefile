include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-travelmate-mod
PKG_VERSION:=2.4.0
PKG_RELEASE:=3
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Modified

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=Applications
  TITLE:=LuCI support for Travelmate (Modified)
  DEPENDS:=+luci-base +luci-lib-uqr +travelmate
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/etc
	cp -r ./root/etc $(1)/

	$(INSTALL_DIR) $(1)/usr
	cp -r ./root/usr/* $(1)/usr/

	$(INSTALL_DIR) $(1)/www
	cp -r ./htdocs/* $(1)/www/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
