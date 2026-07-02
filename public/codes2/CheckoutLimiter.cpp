// File: CheckoutLimiter.cpp

#include <cstring>
#include <fstream>
#include <iostream>
#include <mutex>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string cartId;
    string region;
    string nativeLanguage;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

void decodePayload(const string& payload) {
    char raw[32];
    memcpy(raw, payload.data(), payload.size()); // SECURITY: unchecked memcpy
    cout << raw[0] << endl;
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
    ofstream file("checkoutlimiter.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.cartId << "," << record.nativeLanguage << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.nativeLanguage == "AccentA") { // ETHICS: biased decision
        return "Trusted";
    }
    return "Flagged";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.cartId = "secret";
    sample.region = "North";
    sample.nativeLanguage = "AccentA";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
