#
# Copyright (C) 2020-2022 HandsomeMod Project
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=gc
PKG_VERSION:=20260310
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/lkiuyu/gc.git
PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.xz
PKG_SOURCE_VERSION:=1e2b4d9480cf75663212a2bb7c550f3aae07ef50
PKG_MIRROR_HASH:=skip

PKG_INSTALL:=1
PKG_BUILD_PARALLEL:=1
PKG_LICENSE:=GPL-V2

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/cmake.mk

define Package/gc
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:= Usb Gadget Manager
  DEPENDS:=@USB_GADGET_SUPPORT +kmod-fs-configfs +kmod-usb-gadget +kmod-usb-lib-composite +kmod-usb-gadget-serial +kmod-usb-gadget-mass-storage +kmod-usb-gadget-ncm +libusbgx +android-tools-adbd
endef

define Package/luci-app-gc
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI support for gc USB Gadget Manager
  DEPENDS:= +gc +luci-base
endef

define Package/gc/install
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/gc.init $(1)/etc/init.d/gc

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/hotplug-gcreboot.init $(1)/etc/init.d/hotplug-gcreboot

	$(INSTALL_DIR) $(1)/etc
	$(INSTALL_BIN) ./files/hotplug-gcreboot.json $(1)/etc/hotplug-gcreboot.json

	$(INSTALL_DIR) $(1)/etc/hotplug.d/gcrestart
	$(INSTALL_BIN) ./files/restart_gc.sh $(1)/etc/hotplug.d/gcrestart/restart_gc.sh

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_BIN) ./files/gc.uci $(1)/etc/config/gc

	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/gc $(1)/usr/bin/
	$(INSTALL_BIN) ./files/diag-router $(1)/usr/bin/diag-router
	$(INSTALL_BIN) ./files/rpmsgexport $(1)/usr/bin/rpmsgexport
	$(INSTALL_BIN) ./files/send_data $(1)/usr/bin/send_data
endef

define Package/luci-app-gc/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./luci-app-gc/root/usr/share/luci/menu.d/luci-app-gc.json $(1)/usr/share/luci/menu.d/luci-app-gc.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./luci-app-gc/root/usr/share/rpcd/acl.d/luci-app-gc.json $(1)/usr/share/rpcd/acl.d/luci-app-gc.json

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/gc
	$(INSTALL_DATA) ./luci-app-gc/htdocs/luci-static/resources/view/gc/config.js $(1)/www/luci-static/resources/view/gc/config.js
endef

$(eval $(call BuildPackage,gc))
$(eval $(call BuildPackage,luci-app-gc))
