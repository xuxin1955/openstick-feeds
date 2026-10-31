include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-simadmin
PKG_VERSION:=1.2.3
PKG_RELEASE:=1
PKG_LICENSE:=Proprietary
PKG_MAINTAINER:=local

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-simadmin
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=SimAdmin VoLTE/SMS service and LuCI page
  DEPENDS:=+luci-base +modemmanager +qmi-utils +curl
  PKGARCH:=all
endef

define Build/Compile
endef

define Package/luci-app-simadmin/install
	$(INSTALL_DIR) $(1)/opt/simadmin
	$(CP) ./root/opt/simadmin/. $(1)/opt/simadmin/
	$(INSTALL_DIR) $(1)/opt/simadmin/data
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/simadmin $(1)/etc/init.d/simadmin
	$(INSTALL_BIN) ./root/etc/init.d/simadmin-watchdog $(1)/etc/init.d/simadmin-watchdog
	$(INSTALL_BIN) ./root/etc/init.d/simadmin-imsd $(1)/etc/init.d/simadmin-imsd
	$(INSTALL_BIN) ./root/etc/init.d/simadmin-data $(1)/etc/init.d/simadmin-data
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./root/etc/uci-defaults/99-simadmin $(1)/etc/uci-defaults/99-simadmin
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./root/usr/bin/systemctl $(1)/usr/bin/systemctl
	$(INSTALL_BIN) ./root/usr/bin/nmcli $(1)/usr/bin/nmcli
	$(INSTALL_BIN) ./root/usr/bin/simadmin-watchdog $(1)/usr/bin/simadmin-watchdog
	$(INSTALL_BIN) ./root/usr/bin/simadmin-imsd $(1)/usr/bin/simadmin-imsd
	$(INSTALL_BIN) ./root/usr/bin/simadmin-data $(1)/usr/bin/simadmin-data
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) ./root/usr/sbin/udevadm $(1)/usr/sbin/udevadm
	$(INSTALL_DIR) $(1)/usr/libexec/simadmin
	$(INSTALL_BIN) ./root/usr/libexec/simadmin/qmicli-wrap $(1)/usr/libexec/simadmin/qmicli-wrap
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-simadmin.json $(1)/usr/share/luci/menu.d/luci-app-simadmin.json
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/simadmin
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/simadmin/overview.js $(1)/www/luci-static/resources/view/simadmin/overview.js
endef

define Package/luci-app-simadmin/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -f /tmp/luci-indexcache.*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload 2>/dev/null
	/etc/init.d/simadmin-data enable
	exit 0
}
endef

$(eval $(call BuildPackage,luci-app-simadmin))
