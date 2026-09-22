#ifndef SMSHISTORY_H
#define SMSHISTORY_H

#include <string>
#include <vector>
#include <map>
#include <fstream>
#include <cstdio>
#include <cstring>
#include <sys/stat.h>
#include "../rapidjson/document.h"
#include "../rapidjson/writer.h"
#include "../rapidjson/stringbuffer.h"
#include "../ConfigFileProcess/configfileprocess.h"

using namespace std;

#define DEFAULT_SMS_HISTORY_PATH "/etc/dbussmsforward/history.jsonl"
#define DEFAULT_SMS_HISTORY_MAX  500

// Create a directory and all of its parents, like mkdir -p.
inline void EnsureDirExists(const string& path) {
    if (path.empty() || path == "/" || path == ".") {
        return;
    }
    size_t slash = path.find_last_of('/');
    if (slash != string::npos) {
        EnsureDirExists(path.substr(0, slash));
    }
    mkdir(path.c_str(), 0755);
}

// Read the history settings once. Both the append and the read path need them.
inline void GetSmsHistoryConfig(string& path, int& maxLines) {
    map<string, string> configMap = readConfigFile();

    path = configMap["smsHistoryPath"];
    if (path == "") {
        path = DEFAULT_SMS_HISTORY_PATH;
    }

    maxLines = DEFAULT_SMS_HISTORY_MAX;
    string maxStr = configMap["smsHistoryMax"];
    if (maxStr != "") {
        int parsed = 0;
        if (sscanf(maxStr.c_str(), "%d", &parsed) == 1) {
            maxLines = parsed;
        }
    }
    if (maxLines < 10) {
        maxLines = 10;
    }
    if (maxLines > 100000) {
        maxLines = 100000;
    }
}

// Keep only the last maxLines lines. The append already happened by the time
// this is called, so the file is rewritten only when the limit is exceeded.
inline void TrimSmsHistory(const string& path, int maxLines) {
    ifstream in(path);
    if (!in.is_open()) {
        return;
    }
    vector<string> lines;
    string line;
    while (getline(in, line)) {
        lines.push_back(line);
    }
    in.close();

    if ((int)lines.size() <= maxLines) {
        return;
    }

    ofstream out(path, ofstream::trunc);
    if (!out.is_open()) {
        return;
    }
    size_t start = lines.size() - maxLines;
    for (size_t i = start; i < lines.size(); ++i) {
        out << lines[i] << "\n";
    }
    out.close();
}

// Append one record. The file is JSONL (one JSON object per line) so that an
// append can never corrupt what is already there, even on a power cut; readers
// just parse line by line and skip whatever fails to parse.
inline void AppendSmsHistory(const string& number, const string& text, const string& date,
                             const string& code, const string& codeFrom) {
    string path;
    int maxLines = 0;
    GetSmsHistoryConfig(path, maxLines);

    size_t slash = path.find_last_of('/');
    if (slash != string::npos) {
        EnsureDirExists(path.substr(0, slash));
    }

    rapidjson::StringBuffer sb;
    rapidjson::Writer<rapidjson::StringBuffer> writer(sb);
    writer.StartObject();
    writer.Key("time");   writer.String(date.c_str());
    writer.Key("number"); writer.String(number.c_str());
    writer.Key("text");   writer.String(text.c_str());
    writer.Key("code");   writer.String(code.c_str());
    writer.Key("from");   writer.String(codeFrom.c_str());
    writer.EndObject();

    ofstream out(path, ofstream::app);
    if (!out.is_open()) {
        printf("短信历史写入失败，请检查路径 %s\n", path.c_str());
        return;
    }
    out << sb.GetString() << "\n";
    out.close();

    TrimSmsHistory(path, maxLines);
}

// Read every history line, skipping empty lines and lines that are not JSON objects.
inline vector<string> ReadSmsHistoryLines() {
    string path;
    int maxLines = 0;
    GetSmsHistoryConfig(path, maxLines);

    vector<string> result;
    ifstream in(path);
    if (!in.is_open()) {
        return result;
    }

    string line;
    while (getline(in, line)) {
        if (line.empty()) {
            continue;
        }
        rapidjson::Document doc;
        doc.Parse(line.c_str());
        if (doc.HasParseError() || !doc.IsObject()) {
            continue;
        }
        result.push_back(line);
    }
    in.close();
    return result;
}

#endif // SMSHISTORY_H
