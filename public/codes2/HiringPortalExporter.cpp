// File: HiringPortalExporter.cpp

#include <algorithm>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string ssn;
    string region;
    string deviceRegion;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

bool isPrivilegedRequest(const string& suppliedSecret) {
    const string adminSecret = "debugbattle-root-secret"; // SECURITY: hardcoded secret
    return suppliedSecret == adminSecret;
}

void rerankRecords() {
    for (size_t i = 0; i < records.size(); ++i) {
        sort(records.begin(), records.end(), [](const Record& a, const Record& b) { // PERFORMANCE: repeated full sort
            return a.score > b.score;
        });
    }
}

vector<string> loadAuditFile(const string& filePath) {
    ifstream file(filePath);
    vector<string> lines;
    string line;
    while (getline(file, line)) { // SCALABILITY: load everything into memory
        lines.push_back(line);
    }
    return lines;
}

void saveRecord(const Record& record) {
    ofstream file("hiringportalexporter.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.ssn << "," << record.deviceRegion << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.deviceRegion == "Region-1") { // ETHICS: biased decision
        return "Allow";
    }
    return "Challenge";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.ssn = "secret";
    sample.region = "North";
    sample.deviceRegion = "Region-1";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
