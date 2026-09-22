#ifndef DIRECTACTION_H
#define DIRECTACTION_H

#include <string>
#include <vector>
#include <cstdio>
#include <dbus/dbus.h>
#include "../rapidjson/writer.h"
#include "../rapidjson/stringbuffer.h"
#include "../DbusSmsMethod/dbussmsmethod.h"
#include "../SmsHistory/smshistory.h"

using namespace std;

// Non-interactive entry points, meant to be driven by LuCI or a shell script:
//   --listsms                          print the modem's SMS plus the saved
//                                      history as a single line of JSON
//   --sendsms=<number> --smstext=<text> send one SMS and exit
// Returns -1 when no direct action was requested, in which case main() carries
// on with the normal interactive flow.
int tryDirectAction(int argc, char* argv[]);

struct SmsRecord {
    string number;
    string text;
    string timestamp;
    string storage;
    string state;
};

inline string StorageLabel(uint32_t storage) {
    switch (storage) {
        case 1: return "sm";
        case 2: return "me";
        case 3: return "mt";
        case 4: return "sr";
        case 5: return "bm";
        case 6: return "ta";
        default: return "unknown";
    }
}

// ModemManager MM_SMS_STATE_*
inline string StateLabel(uint32_t state) {
    switch (state) {
        case 1: return "stored";
        case 2: return "received";
        case 3: return "sending";
        case 4: return "sent";
        default: return "unknown";
    }
}

// Read every property of one SMS object. Each one has to be checked for
// presence: an SMS may have no Number (PDU-only) and no Text.
inline bool ReadSmsProperties(DBusConnection* connection, const char* smsPath, SmsRecord& record) {
    DBusError error;
    dbus_error_init(&error);

    DBusMessage* message = dbus_message_new_method_call(
        "org.freedesktop.ModemManager1",
        smsPath,
        "org.freedesktop.DBus.Properties",
        "GetAll"
    );
    if (message == nullptr) {
        return false;
    }
    const char* interfaceName = "org.freedesktop.ModemManager1.Sms";
    dbus_message_append_args(message, DBUS_TYPE_STRING, &interfaceName, DBUS_TYPE_INVALID);

    DBusMessage* reply = dbus_connection_send_with_reply_and_block(connection, message, 5000, &error);
    dbus_message_unref(message);

    if (dbus_error_is_set(&error)) {
        dbus_error_free(&error);
        return false;
    }
    if (reply == nullptr) {
        return false;
    }

    DBusMessageIter iter;
    if (!dbus_message_iter_init(reply, &iter) ||
        dbus_message_iter_get_arg_type(&iter) != DBUS_TYPE_ARRAY) {
        dbus_message_unref(reply);
        return false;
    }

    DBusMessageIter arrayIter;
    dbus_message_iter_recurse(&iter, &arrayIter);
    while (dbus_message_iter_get_arg_type(&arrayIter) != DBUS_TYPE_INVALID) {
        if (dbus_message_iter_get_arg_type(&arrayIter) == DBUS_TYPE_DICT_ENTRY) {
            DBusMessageIter dictIter;
            dbus_message_iter_recurse(&arrayIter, &dictIter);

            const char* key = nullptr;
            if (dbus_message_iter_get_arg_type(&dictIter) == DBUS_TYPE_STRING) {
                dbus_message_iter_get_basic(&dictIter, &key);
            }

            if (key != nullptr && dbus_message_iter_next(&dictIter)) {
                DBusMessageIter variantIter;
                dbus_message_iter_recurse(&dictIter, &variantIter);
                int valueType = dbus_message_iter_get_arg_type(&variantIter);
                string keyName(key);

                if (valueType == DBUS_TYPE_STRING) {
                    const char* value = nullptr;
                    dbus_message_iter_get_basic(&variantIter, &value);
                    string text = value ? value : "";
                    if (keyName == "Number") {
                        record.number = text;
                    }
                    else if (keyName == "Text") {
                        record.text = text;
                    }
                    else if (keyName == "Timestamp") {
                        record.timestamp = text;
                    }
                }
                else if (valueType == DBUS_TYPE_UINT32) {
                    uint32_t value = 0;
                    dbus_message_iter_get_basic(&variantIter, &value);
                    if (keyName == "Storage") {
                        record.storage = StorageLabel(value);
                    }
                    else if (keyName == "State") {
                        record.state = StateLabel(value);
                    }
                }
            }
        }
        dbus_message_iter_next(&arrayIter);
    }

    dbus_message_unref(reply);
    return true;
}

// List the SMS of one modem slot. Returns false when that slot does not exist,
// which is the caller's signal to stop iterating.
inline bool ListModemSms(DBusConnection* connection, uint32_t modemIndex, vector<SmsRecord>& out) {
    DBusError error;
    dbus_error_init(&error);

    char modemPath[64];
    snprintf(modemPath, sizeof(modemPath), "/org/freedesktop/ModemManager1/Modem/%u", modemIndex);

    DBusMessage* message = dbus_message_new_method_call(
        "org.freedesktop.ModemManager1",
        modemPath,
        "org.freedesktop.ModemManager1.Modem.Messaging",
        "List"
    );
    if (message == nullptr) {
        return false;
    }

    DBusMessage* reply = dbus_connection_send_with_reply_and_block(connection, message, 5000, &error);
    dbus_message_unref(message);

    if (dbus_error_is_set(&error)) {
        dbus_error_free(&error);
        return false;
    }
    if (reply == nullptr) {
        return false;
    }

    const char** smsPaths = nullptr;
    int pathCount = 0;
    if (!dbus_message_get_args(reply, &error,
            DBUS_TYPE_ARRAY, DBUS_TYPE_OBJECT_PATH, &smsPaths, &pathCount,
            DBUS_TYPE_INVALID)) {
        dbus_error_free(&error);
        dbus_message_unref(reply);
        return true;
    }

    for (int i = 0; i < pathCount; ++i) {
        SmsRecord record;
        if (ReadSmsProperties(connection, smsPaths[i], record)) {
            out.push_back(record);
        }
    }

    dbus_message_unref(reply);
    return true;
}

inline void WriteSmsJson() {
    vector<SmsRecord> live;

    DBusError error;
    dbus_error_init(&error);
    DBusConnection* connection = dbus_bus_get(DBUS_BUS_SYSTEM, &error);
    if (dbus_error_is_set(&error)) {
        dbus_error_free(&error);
    }
    if (connection != nullptr) {
        // ModemManager numbers its slots from 0 without gaps, so the first
        // missing one means there is nothing after it.
        for (uint32_t index = 0; index < 8; ++index) {
            if (!ListModemSms(connection, index, live)) {
                break;
            }
        }
        dbus_connection_unref(connection);
    }

    vector<string> history = ReadSmsHistoryLines();

    rapidjson::StringBuffer buffer;
    rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);

    writer.StartObject();

    writer.Key("live");
    writer.StartArray();
    for (const auto& sms : live) {
        writer.StartObject();
        writer.Key("number");    writer.String(sms.number.c_str());
        writer.Key("text");      writer.String(sms.text.c_str());
        writer.Key("timestamp"); writer.String(sms.timestamp.c_str());
        writer.Key("storage");   writer.String(sms.storage.c_str());
        writer.Key("state");     writer.String(sms.state.c_str());
        writer.EndObject();
    }
    writer.EndArray();

    // Each history line is already a valid JSON object, so it can be embedded
    // as a raw value.
    writer.Key("history");
    writer.StartArray();
    for (const auto& line : history) {
        writer.RawValue(line.c_str(), line.size(), rapidjson::kObjectType);
    }
    writer.EndArray();

    writer.EndObject();

    printf("%s\n", buffer.GetString());
}

inline int tryDirectAction(int argc, char* argv[]) {
    bool listSms = false;
    string sendTo = "";
    string sendText = "";
    bool hasSendText = false;

    for (int i = 1; i < argc; ++i) {
        string argument = argv[i];
        if (argument == "--listsms") {
            listSms = true;
        }
        else if (argument.compare(0, 10, "--sendsms=") == 0) {
            sendTo = argument.substr(10);
        }
        else if (argument.compare(0, 10, "--smstext=") == 0) {
            sendText = argument.substr(10);
            hasSendText = true;
        }
    }

    if (listSms) {
        WriteSmsJson();
        return 0;
    }

    if (sendTo != "") {
        if (!hasSendText) {
            printf("缺少 --smstext=<内容> 参数\n");
            return 1;
        }
        if (sendSms(sendTo, sendText, "api")) {
            printf("短信已发送\n");
            return 0;
        }
        printf("短信发送失败\n");
        return 1;
    }

    return -1;
}

#endif // DIRECTACTION_H
