Linux Install
##################

Installation will require Python 3.6 and pip3.

Ubuntu
*************

You can install the required packages on Ubuntu by running the following command:

.. code-block:: bash

  sudo apt-get install -y python3 python3-pip python-dev build-essential git libssl-dev libffi-dev
  curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
  sudo apt-get install -y nodejs git npm


Debian 7/8/9
************

Debian's sources lists are out of date and will not fetch the correct versions of NodeJS and NPM. You must download and install these from the Node repository:

.. code-block:: bash

    curl -sL https://raw.githubusercontent.com/nodesource/distributions/master/deb/setup_8.x | sudo -E bash -

    sudo apt-get install -y build-essential libbz2-dev libreadline-dev libssl-dev libffi-dev zlib1g-dev libncurses5-dev libssl-dev libgdbm-dev python3 python3-dev nodejs git npm

    curl -sL https://bootstrap.pypa.io/get-pip.py | sudo python -

After install, check that you have the correct versions in your environment variables:

.. code-block:: bash

	~$ python3 --version
		Python 3.6.8
	~$ pip3 --version
		pip 9.0.1 from /usr/lib/python3/dist-packages (python 3.6)

If your output looks as above, you can proceed with installation:

.. code-block:: bash

	cd ~/
	git clone https://github.com/cecpk/RocketMAD.git
	cd RocketMAD/
	sudo -H pip3 install -r requirements.txt
	npm install
	sudo npm install -g grunt-cli
	sudo grunt build

Troubleshooting:
****************

	If you have preciously installed pip packages before following this guide, you may need to remove them before installing:

.. code-block:: bash

	pip3 freeze | xargs pip3 uninstall -y

If you have other pip installed packages, the old requirements.txt and cannot uninstall all then you can use:

.. code-block:: bash

	pip3 uninstall -r "old requirements.txt"
	pip3 install -r "new requirements.txt"

An error resulting from not removing previous packages can be:

.. code-block:: bash

	016-12-29 00:50:37,560 [ search-worker-1][        search][    INFO] Searching at xxxxxxx,xxxxxxx
	2016-12-29 00:50:37,575 [ search-worker-1][        search][ WARNING] Exception while downloading map:
	2016-12-29 00:50:37,575 [ search-worker-1][        search][   ERROR] Invalid response at xxxxxxx,xxxxxxx, abandoning location

If you're getting the following error:

.. code-block:: bash

	root:~/RocketMap# ./runserver.py
	Traceback (most recent call last):
  		File "./runserver.py", line 10, in <module>
  		import requests
	ImportError: No module named requests

	You will need to completely uninstall all of your pip packages, pip, and python, then re-install from source again. Something from your previous installation is still hanging around.

Debian 7
********

Additional steps are required to get Debian 7 (wheezy) working. You'll need to update from ``glibc`` to ``eglibc``

Edit your ``/etc/apt/sources.list`` file and add the following line:

.. code-block:: bash

	deb http://ftp.debian.org/debian sid main

Then install the packages for ``eglibc``:

.. code-block:: bash

	sudo apt-get update
	apt-get -t sid install libc6-amd64 libc6-dev libc6-dbg
	reboot

Red Hat or CentOs or Fedora
***************************

You can install required packages on Red Hat by running the following command:

You may also need to install the EPEL repository to install ``python-pip`` and ``python-devel``.

.. code-block:: bash

  yum install epel-release
  yum install python python-pip python-devel

  Fedora Server:
  dnf install python
  dnf install redhat-rpm-config // fix for error: command 'gcc' failed with exit status 1


All set, head back to the basic install guide.
