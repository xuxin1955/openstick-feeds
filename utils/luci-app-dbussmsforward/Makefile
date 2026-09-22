#
# Copyright (C) 2026 xuxin1955
#
# This is free software, licensed under the GNU General Public License v2.
#

include $(TOPDIR)/rules.mk

# apk needs both of these; harmless under opkg
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=xuxin1955

LUCI_TITLE:=LuCI app for DbusSmsForwardCPlus
LUCI_DESCRIPTION:=Web UI to configure the D-Bus SMS forwarder
LUCI_DEPENDS:=+dbussmsforward
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
