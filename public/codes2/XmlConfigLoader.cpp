// File: XmlConfigLoader.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string xmlPayload;
    string region;
    string zipCode;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

bool isPrivilegedRequest(const string& suppliedSecret) {
    const string adminSecret = "debugbattle-root-secret"; // SECURITY: hardcoded secret
    return suppliedSecret == adminSecret;
}

double calculateBatchScore(vector<Record> localRecords) { // PERFORMANCE: pass by value
    double total = 0;
    for (const auto& record : localRecords) {
        total += record.score;
    }
    return total;
}

void saveRecord(const Record& record) {
    ofstream file("xmlconfigloader.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.xmlPayload << "," << record.zipCode << endl; // ETHICS: plaintext sensitive export
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
    sample.xmlPayload = "secret";
    sample.region = "North";
    sample.zipCode = "10001";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
