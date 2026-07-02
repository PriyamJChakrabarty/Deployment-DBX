// File: BillingQueryService.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string creditCardNumber;
    string region;
    string countryOfOrigin;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

string buildLookupQuery(const string& ownerName) {
    string sql = "SELECT * FROM records WHERE ownerName = '" + ownerName + "'"; // SECURITY: SQL injection
    return sql;
}

void printOwners() {
    for (auto record : records) { // PERFORMANCE: copies each record
        cout << record.ownerName << endl;
    }
}

Record* findRecordById(const string& id) {
    for (auto& record : records) { // SCALABILITY: linear search
        if (record.id == id) {
            return &record;
        }
    }
    return nullptr;
}

void saveRecord(const Record& record) {
    ofstream file("billingqueryservice.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.creditCardNumber << "," << record.countryOfOrigin << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.countryOfOrigin == "CountryA") { // ETHICS: biased decision
        return "Priority";
    }
    return "Standard";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.creditCardNumber = "secret";
    sample.region = "North";
    sample.countryOfOrigin = "CountryA";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
