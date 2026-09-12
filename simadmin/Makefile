include $(TOPDIR)/rules.mk

PKG_NAME:=simadmin
PKG_VERSION:=1.1.12
PKG_RELEASE:=1
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/simadmin
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=SimAdmin
  TITLE:=SimAdmin web admin for cellular devices
  URL:=https://github.com/3899/SimAdmin
  DEPENDS:=+modemmanager +dbus +libsqlite3 \
           +kmod-usb-net +kmod-usb-net-option +kmod-usb-serial +kmod-usb-serial-option \
           +kmod-usb-serial-wwan +mmcli +qmicli +uqmi
endef

define Package/simadmin/description
  SimAdmin web UI (SIM/eSIM/SMS/cellular/DDNS) for ImmortalWrt.
  Backend: Rust/Axum over ModemManager D-Bus.
  WLAN client (NetworkManager) features are unavailable on ImmortalWrt.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) ./prebuilt/simadmin $(PKG_BUILD_DIR)/simadmin
	$(CP) -r ./prebuilt/www $(PKG_BUILD_DIR)/www
endef

define Build/Compile
	true
endef

define Package/simadmin/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/simadmin $(1)/usr/bin/simadmin
	$(INSTALL_DIR) $(1)/usr/bin/www
	$(CP) $(PKG_BUILD_DIR)/www/* $(1)/usr/bin/www/
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/simadmin.init $(1)/etc/init.d/simadmin
	$(INSTALL_DIR) $(1)/etc/dbus-1/system.d
	$(INSTALL_CONF) ./files/dbus/simadmin.conf $(1)/etc/dbus-1/system.d/simadmin.conf
endef

$(eval $(call BuildPackage,simadmin))
