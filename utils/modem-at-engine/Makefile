include $(TOPDIR)/rules.mk

PKG_NAME:=modem-at-engine
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0

include $(INCLUDE_DIR)/package.mk

define Package/modem-at-engine
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=AT Command Engine via uBus for MSM8916
  PKGARCH:=all
endef

define Package/modem-at-engine/description
  A simple uBus RPC daemon to safely execute AT commands on /dev/wwan0at1.
endef

define Build/Compile
endef

define Package/modem-at-engine/install
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./files/modem_at.sh $(1)/usr/libexec/rpcd/modem_at

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./files/modem_at.json $(1)/usr/share/rpcd/acl.d/modem_at.json
endef

$(eval $(call BuildPackage,modem-at-engine))