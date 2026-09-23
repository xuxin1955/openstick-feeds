include $(TOPDIR)/rules.mk

PKG_NAME:=sms-sqlite-sync
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0

include $(INCLUDE_DIR)/package.mk

define Package/sms-sqlite-sync
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=SMS Sync to SQLite and Email
  DEPENDS:=+sqlite3-cli +mailsend +modem-at-engine
  PKGARCH:=all
endef

define Package/sms-sqlite-sync/description
  Polls modem for SMS, saves to SQLite database, deletes from SIM, and forwards via email.
endef

define Build/Compile
endef

define Package/sms-sqlite-sync/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/sms_sync.sh $(1)/usr/bin/sms_sync
	$(INSTALL_BIN) ./files/sms_send.sh $(1)/usr/bin/sms_send

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/sms_sync.conf $(1)/etc/config/sms_sync

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/99-sms-sync-cron $(1)/etc/uci-defaults/99-sms-sync-cron
endef

$(eval $(call BuildPackage,sms-sqlite-sync))