// File: PayrollCsvExporter.cpp

#include <fstream>
#include <iostream>
#include <mutex>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string taxId;
    string region;
    string veteranStatus;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

string buildLookupQuery(const string& ownerName) {
    string sql = "SELECT * FROM records WHERE ownerName = '" + ownerName + "'"; // SECURITY: SQL injection
    return sql;
}

string renderReport() {
    string report;
    for (const auto& record : records) {
        report += record.id + "," + record.ownerName + "," + to_string(record.score) + "\n"; // PERFORMANCE: repeated string growth
    }
    return report;
}

mutex recordsMutex;

void persistAllLocked() {
    lock_guard<mutex> guard(recordsMutex); // SCALABILITY: single global lock
    for (const auto& record : records) {
        cout << record.id << endl;
    }
}

void saveRecord(const Record& record) {
    ofstream file("payrollcsvexporter.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.taxId << "," << record.veteranStatus << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.veteranStatus == "Yes") { // ETHICS: biased decision
        return "SpecialCase";
    }
    return "NormalCase";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.taxId = "secret";
    sample.region = "North";
    sample.veteranStatus = "Yes";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
