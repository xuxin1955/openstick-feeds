include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-simadmin
PKG_VERSION:=1.2.1
PKG_RELEASE:=1

PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-simadmin
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=SimAdmin SIM management
  DEPENDS:=+modemmanager +dbus +libsqlite3 +luci-base
endef

define Package/luci-app-simadmin/description
  SimAdmin Web SIM management with LuCI entry (OpenWrt adapted).
endef

define Build/Compile
endef

define Package/luci-app-simadmin/install
$(INSTALL_DIR) $(1)/opt/simadmin
$(INSTALL_BIN) ./files/opt/simadmin/simadmin $(1)/opt/simadmin/simadmin
$(INSTALL_DIR) $(1)/opt/simadmin/www
$(CP) ./files/opt/simadmin/www/* $(1)/opt/simadmin/www/
$(INSTALL_DIR) $(1)/etc/init.d
$(INSTALL_BIN) ./files/etc/init.d/simadmin $(1)/etc/init.d/simadmin
$(INSTALL_DIR) $(1)/etc/rc.d
$(LN) ../init.d/simadmin $(1)/etc/rc.d/S98simadmin
$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
$(INSTALL_DATA) ./files/usr/share/luci/menu.d/luci-app-simadmin.json $(1)/usr/share/luci/menu.d/
$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/luci-app-simadmin.json $(1)/usr/share/rpcd/acl.d/
$(INSTALL_DIR) $(1)/www/luci-static/resources/view/simadmin
$(INSTALL_DATA) ./files/www/luci-static/resources/view/simadmin/index.js $(1)/www/luci-static/resources/view/simadmin/
endef

$(eval $(call BuildPackage,luci-app-simadmin))
