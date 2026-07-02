// File: GlobalCacheService.cpp

#include <fstream>
#include <iostream>
#include <regex>
#include <string>
#include <thread>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string cacheKey;
    string region;
    string zipCode;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

bool matchesRule(const string& userPattern, const string& text) {
    regex rule(userPattern); // SECURITY: user-controlled regex
    return regex_match(text, rule);
}

void compareEveryRecord() {
    for (size_t outer = 0; outer < records.size(); ++outer) {
        for (size_t inner = 0; inner < records.size(); ++inner) { // PERFORMANCE: quadratic loop
            cout << records[outer].id << '-' << records[inner].id << endl;
        }
    }
}

void notifyRecords() {
    vector<thread> workers;
    for (const auto& record : records) {
        workers.emplace_back([record]() { cout << record.ownerName << endl; }); // SCALABILITY: thread per record
    }
    for (auto& worker : workers) {
        worker.join();
    }
}

void saveRecord(const Record& record) {
    ofstream file("globalcacheservice.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.cacheKey << "," << record.zipCode << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.zipCode == "10001") { // ETHICS: biased decision
        return "Allow";
    }
    return "ManualReview";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.cacheKey = "secret";
    sample.region = "North";
    sample.zipCode = "10001";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
