#
# Copyright (C) 2026 xuxin1955
#
# This is free software, licensed under the GNU General Public License v2.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=dbussmsforward
PKG_VERSION:=1.0.7
PKG_RELEASE:=1

# apk needs both of these; harmless under opkg
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=xuxin1955

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

define Package/dbussmsforward
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Forward ModemManager SMS over D-Bus to multiple channels
  URL:=https://github.com/xuxin1955/DbusSmsForwardCPlus
  DEPENDS:=+libdbus +libopenssl +libcurl +libstdcpp +modemmanager +ca-bundle
endef

define Package/dbussmsforward/description
  通过 D-Bus 监听 ModemManager 收到的新短信，转发到邮件、PushPlus、企业微信自建应用、
  Telegram 机器人、钉钉机器人、Bark 或自定义 Shell 脚本，并可选开启发送短信的 HTTP API。
endef

define Package/dbussmsforward/conffiles
/etc/config/dbussmsforward
endef

define Build/Prepare
	$(INSTALL_DIR) $(PKG_BUILD_DIR)
	$(CP) -r ./src/. $(PKG_BUILD_DIR)/
endef

define Build/Compile
	$(TARGET_CXX) \
		$(TARGET_CPPFLAGS) $(TARGET_CXXFLAGS) \
		-std=gnu++11 -Wall -Wextra -Wno-deprecated-declarations \
		-I$(STAGING_DIR)/usr/include/dbus-1.0 \
		-I$(STAGING_DIR)/usr/lib/dbus-1.0/include \
		-o $(PKG_BUILD_DIR)/DbusSmsForwardCPlus \
		$(PKG_BUILD_DIR)/main.cpp $(PKG_BUILD_DIR)/mail.cpp \
		$(TARGET_LDFLAGS) -ldbus-1 -lssl -lcrypto -lcurl -lpthread
endef

define Package/dbussmsforward/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/DbusSmsForwardCPlus $(1)/usr/bin/DbusSmsForwardCPlus
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/dbussmsforward.init $(1)/etc/init.d/dbussmsforward
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/dbussmsforward.config $(1)/etc/config/dbussmsforward
endef

$(eval $(call BuildPackage,dbussmsforward))
