include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-vohive
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=VoHive

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-vohive
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Modem
  TITLE:=VoHive 模组管理器
endef

define Build/Compile
endef

define Package/luci-app-vohive/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_DIR) $(1)/opt/vohive/config
	$(INSTALL_DIR) $(1)/opt/vohive/data
	$(INSTALL_DIR) $(1)/opt/vohive/logs
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/view/vohive

	$(INSTALL_BIN) ./root/usr/bin/vohive $(1)/usr/bin/vohive
	$(INSTALL_BIN) ./root/etc/init.d/vohive $(1)/etc/init.d/vohive
	$(INSTALL_CONF) ./root/opt/vohive/config/config.yaml $(1)/opt/vohive/config/config.yaml
	$(INSTALL_DATA) ./root/usr/lib/lua/luci/controller/vohive.lua $(1)/usr/lib/lua/luci/controller/vohive.lua
	$(INSTALL_DATA) ./root/usr/lib/lua/luci/view/vohive/index.htm $(1)/usr/lib/lua/luci/view/vohive/index.htm
endef

$(eval $(call BuildPackage,luci-app-vohive))